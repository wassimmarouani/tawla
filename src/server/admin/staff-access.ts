import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { and, count, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import {
  PAIRING_CODE_TTL_SECONDS,
  generatePairingCode,
  normalizePairingCode,
  pairingCodeState,
  staffLimitOf,
  staffSeatsLeft,
  staffSessionExpiry,
} from '@/features/staff';
import { rawDb } from '@/lib/db/client';
import {
  devicePairingCodes,
  memberships,
  plans,
  restaurants,
  staffDevices,
  staffInvitations,
  staffSessions,
  subscriptions,
} from '@/lib/db/schema/schema';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { writeAudit } from './audit';
import { adminEnv } from './env';

/**
 * Staff access (ADR-0010, P1-11): device pairing, staff sessions on paired devices and staff
 * invitations. Privileged: callers check permissions first (back-office `staff.manage`, or the
 * device cookie on the staff surface). Codes and device tokens are stored as SHA-256 only.
 */

type DeviceMode = 'fixed' | 'mobile';
export type StaffRole = 'owner' | 'manager' | 'counter' | 'waiter' | 'station';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** `05:00:00` → 300. */
function intervalMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

// ---------------------------------------------------------------- pairing

export async function createPairingCode(input: {
  restaurantId: string;
  actorId: string;
  label: string;
  mode: DeviceMode;
}): Promise<{ code: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_SECONDS * 1000);
  // A collision with another live code is astronomically rare; retry rather than fail.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = randomBytes(64);
    let index = 0;
    const code = generatePairingCode(() => bytes[index++ % bytes.length] ?? 0);
    const rows = await rawDb()
      .insert(devicePairingCodes)
      .values({
        restaurantId: input.restaurantId,
        codeHash: sha256(code),
        label: input.label,
        mode: input.mode,
        createdBy: input.actorId,
        expiresAt: expiresAt.toISOString(),
      })
      .onConflictDoNothing()
      .returning({ id: devicePairingCodes.id });
    if (rows.length > 0) return { code, expiresAt };
  }
  throw new AppError('INTERNAL', 'Could not allocate a pairing code');
}

/**
 * Redeems a pairing code on the device being paired: creates the device and returns its
 * 256-bit token (the caller sets it as the device cookie). Codes work once, within 10 minutes.
 */
export async function claimPairingCode(
  typed: string,
): Promise<{ token: string; deviceId: string; restaurantId: string }> {
  const code = normalizePairingCode(typed);
  if (!code) throw new AppError('PAIRING_CODE_INVALID', 'Malformed pairing code');
  return rawDb().transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: devicePairingCodes.id,
        restaurantId: devicePairingCodes.restaurantId,
        label: devicePairingCodes.label,
        mode: devicePairingCodes.mode,
        createdBy: devicePairingCodes.createdBy,
        expiresAt: devicePairingCodes.expiresAt,
        usedAt: devicePairingCodes.usedAt,
      })
      .from(devicePairingCodes)
      .where(and(eq(devicePairingCodes.codeHash, sha256(code)), isNull(devicePairingCodes.usedAt)))
      .for('update')
      .limit(1);
    const state = row
      ? pairingCodeState(
          { expiresAt: new Date(row.expiresAt), usedAt: row.usedAt ? new Date(row.usedAt) : null },
          new Date(),
        )
      : 'used';
    if (!row || state !== 'usable') {
      throw new AppError('PAIRING_CODE_INVALID', 'Unknown, used or expired pairing code', {
        reason: state,
      });
    }
    const token = randomBytes(32).toString('base64url');
    const [device] = await tx
      .insert(staffDevices)
      .values({
        restaurantId: row.restaurantId,
        label: row.label,
        mode: row.mode,
        tokenHash: sha256(token),
        createdBy: row.createdBy,
      })
      .returning({ id: staffDevices.id });
    if (!device) throw new AppError('INTERNAL', 'Device insert returned no row');
    await tx
      .update(devicePairingCodes)
      .set({ usedAt: sql`now()`, deviceId: device.id })
      .where(eq(devicePairingCodes.id, row.id));
    await writeAudit(
      {
        restaurantId: row.restaurantId,
        actorId: row.createdBy,
        action: 'device.pair',
        entity: 'staff_device',
        entityId: device.id,
        diff: { label: row.label, mode: row.mode },
      },
      tx,
    );
    return { token, deviceId: device.id, restaurantId: row.restaurantId };
  });
}

export interface PairedDevice {
  id: string;
  label: string;
  mode: DeviceMode;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  timeZone: string;
  dayCutoffMinutes: number;
}

/** The live device behind a device cookie, or `null` (unknown, revoked, deleted venue). */
export async function deviceForToken(token: string | undefined): Promise<PairedDevice | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await rawDb()
    .select({
      id: staffDevices.id,
      label: staffDevices.label,
      mode: staffDevices.mode,
      restaurantId: staffDevices.restaurantId,
      restaurantName: restaurants.name,
      restaurantSlug: restaurants.slug,
      timeZone: restaurants.timezone,
      dayCutoff: restaurants.dayCutoff,
    })
    .from(staffDevices)
    .innerJoin(restaurants, eq(restaurants.id, staffDevices.restaurantId))
    .where(
      and(
        eq(staffDevices.tokenHash, sha256(token)),
        isNull(staffDevices.revokedAt),
        isNull(restaurants.deletedAt),
        ne(restaurants.status, 'suspended'),
      ),
    )
    .limit(1);
  if (!row) return null;
  const { dayCutoff, ...device } = row;
  return { ...device, dayCutoffMinutes: intervalMinutes(dayCutoff) };
}

export async function updateDevice(input: {
  restaurantId: string;
  deviceId: string;
  actorId: string;
  label: string;
  mode: DeviceMode;
}): Promise<void> {
  const rows = await rawDb()
    .update(staffDevices)
    .set({ label: input.label, mode: input.mode })
    .where(
      and(
        eq(staffDevices.restaurantId, input.restaurantId),
        eq(staffDevices.id, input.deviceId),
        isNull(staffDevices.revokedAt),
      ),
    )
    .returning({ id: staffDevices.id });
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'Device not found');
}

/** Deletes Supabase auth sessions so their refresh tokens stop working at once. */
async function deleteAuthSessions(ids: (string | null)[]) {
  const live = ids.filter((id): id is string => id !== null);
  if (live.length === 0) return;
  await rawDb().execute(
    sql`delete from auth.sessions where id in (${sql.join(
      live.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})`,
  );
}

/**
 * Revokes a device: its cookie stops working at once and every session started on it ends
 * (ADR-0010 §3). Staff pages and APIs check the device on each request.
 */
export async function revokeDevice(input: {
  restaurantId: string;
  deviceId: string;
  actorId: string;
}): Promise<void> {
  const ended = await rawDb().transaction(async (tx) => {
    const rows = await tx
      .update(staffDevices)
      .set({ revokedAt: sql`now()`, revokedBy: input.actorId })
      .where(
        and(
          eq(staffDevices.restaurantId, input.restaurantId),
          eq(staffDevices.id, input.deviceId),
          isNull(staffDevices.revokedAt),
        ),
      )
      .returning({ id: staffDevices.id });
    if (rows.length === 0) throw new AppError('NOT_FOUND', 'Device not found');
    const sessions = await tx
      .update(staffSessions)
      .set({ endedAt: sql`now()`, endedBy: input.actorId })
      .where(and(eq(staffSessions.deviceId, input.deviceId), isNull(staffSessions.endedAt)))
      .returning({ authSessionId: staffSessions.authSessionId });
    await writeAudit(
      {
        restaurantId: input.restaurantId,
        actorId: input.actorId,
        action: 'device.revoke',
        entity: 'staff_device',
        entityId: input.deviceId,
      },
      tx,
    );
    return sessions;
  });
  await deleteAuthSessions(ended.map((session) => session.authSessionId));
}

// ---------------------------------------------------------------- staff sessions

export interface ActiveStaffSession {
  id: string;
  membershipId: string;
  role: StaffRole;
  displayName: string | null;
  expiresAt: string;
}

/**
 * Records a login on a paired device for a member of the device's restaurant (any active
 * role). Returns `null` when the user is not a member there: the caller signs them out.
 */
export async function startStaffSession(input: {
  device: PairedDevice;
  userId: string;
  authSessionId: string | null;
}): Promise<ActiveStaffSession | null> {
  const [membership] = await rawDb()
    .select({ id: memberships.id, role: memberships.role, displayName: memberships.displayName })
    .from(memberships)
    .where(
      and(
        eq(memberships.restaurantId, input.device.restaurantId),
        eq(memberships.userId, input.userId),
        eq(memberships.isActive, true),
      ),
    )
    .limit(1);
  if (!membership) return null;
  const expiresAt = staffSessionExpiry(input.device.mode, new Date(), {
    timeZone: input.device.timeZone,
    dayCutoffMinutes: input.device.dayCutoffMinutes,
  });
  const [session] = await rawDb()
    .insert(staffSessions)
    .values({
      restaurantId: input.device.restaurantId,
      membershipId: membership.id,
      deviceId: input.device.id,
      userId: input.userId,
      authSessionId: input.authSessionId,
      expiresAt: expiresAt.toISOString(),
    })
    .returning({ id: staffSessions.id });
  await rawDb()
    .update(staffDevices)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(staffDevices.id, input.device.id));
  if (!session) throw new AppError('INTERNAL', 'Staff session insert returned no row');
  return {
    id: session.id,
    membershipId: membership.id,
    role: membership.role,
    displayName: membership.displayName,
    expiresAt: expiresAt.toISOString(),
  };
}

/** The user's live session on this device (not ended, not expired, member still active). */
export async function activeStaffSession(input: {
  deviceId: string;
  userId: string;
}): Promise<ActiveStaffSession | null> {
  const [row] = await rawDb()
    .select({
      id: staffSessions.id,
      membershipId: staffSessions.membershipId,
      role: memberships.role,
      displayName: memberships.displayName,
      expiresAt: staffSessions.expiresAt,
    })
    .from(staffSessions)
    .innerJoin(
      memberships,
      and(
        eq(memberships.restaurantId, staffSessions.restaurantId),
        eq(memberships.id, staffSessions.membershipId),
      ),
    )
    .where(
      and(
        eq(staffSessions.deviceId, input.deviceId),
        eq(staffSessions.userId, input.userId),
        isNull(staffSessions.endedAt),
        gt(staffSessions.expiresAt, sql`now()`),
        eq(memberships.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Remote logout from the back-office (spec 04 "active sessions"). */
export async function endStaffSession(input: {
  restaurantId: string;
  sessionId: string;
  actorId: string;
}): Promise<void> {
  const [row] = await rawDb()
    .update(staffSessions)
    .set({ endedAt: sql`now()`, endedBy: input.actorId })
    .where(
      and(
        eq(staffSessions.restaurantId, input.restaurantId),
        eq(staffSessions.id, input.sessionId),
        isNull(staffSessions.endedAt),
      ),
    )
    .returning({ authSessionId: staffSessions.authSessionId, userId: staffSessions.userId });
  if (!row) throw new AppError('NOT_FOUND', 'Session not found');
  await writeAudit({
    restaurantId: input.restaurantId,
    actorId: input.actorId,
    action: 'staff_session.end',
    entity: 'staff_session',
    entityId: input.sessionId,
  });
  await deleteAuthSessions([row.authSessionId]);
}

/** The person signs out on the device. */
export async function endOwnStaffSessions(input: {
  deviceId: string;
  userId: string;
}): Promise<void> {
  await rawDb()
    .update(staffSessions)
    .set({ endedAt: sql`now()`, endedBy: input.userId })
    .where(
      and(
        eq(staffSessions.deviceId, input.deviceId),
        eq(staffSessions.userId, input.userId),
        isNull(staffSessions.endedAt),
      ),
    );
}

// ---------------------------------------------------------------- invitations

async function staffLimit(restaurantId: string): Promise<number | null> {
  const [row] = await rawDb()
    .select({ limits: plans.limits })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.restaurantId, restaurantId))
    .limit(1);
  return staffLimitOf(row?.limits);
}

/** Seats left on the plan: active non-owner members plus pending invitations count. */
export async function staffSeats(restaurantId: string): Promise<{
  limit: number | null;
  left: number;
}> {
  const [limit, [members], [pending]] = await Promise.all([
    staffLimit(restaurantId),
    rawDb()
      .select({ value: count() })
      .from(memberships)
      .where(
        and(
          eq(memberships.restaurantId, restaurantId),
          eq(memberships.isActive, true),
          ne(memberships.role, 'owner'),
        ),
      ),
    rawDb()
      .select({ value: count() })
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.restaurantId, restaurantId),
          isNull(staffInvitations.acceptedAt),
          isNull(staffInvitations.revokedAt),
          gt(staffInvitations.expiresAt, sql`now()`),
        ),
      ),
  ]);
  return { limit, left: staffSeatsLeft(limit, members?.value ?? 0, pending?.value ?? 0) };
}

const adminAuth = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, adminEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;

/**
 * Invites a staff member by email (spec 04): Supabase Auth sends the invitation (template
 * `invite.html`, link to /invite/accept). Refused past the plan's staff limit
 * (PLAN_LIMIT_REACHED) and for addresses that already have an account (Phase 1).
 */
export async function inviteStaff(input: {
  restaurantId: string;
  actorId: string;
  email: string;
  role: Exclude<StaffRole, 'owner'>;
  locale: string;
}): Promise<{ invitationId: string }> {
  const seats = await staffSeats(input.restaurantId);
  if (seats.left <= 0) {
    throw new AppError('PLAN_LIMIT_REACHED', 'Staff limit reached', {
      reason: 'staff',
      limit: seats.limit,
    });
  }
  return rawDb().transaction(async (tx) => {
    const [invitation] = await tx
      .insert(staffInvitations)
      .values({
        restaurantId: input.restaurantId,
        email: input.email,
        role: input.role,
        invitedBy: input.actorId,
      })
      .onConflictDoNothing()
      .returning({ id: staffInvitations.id });
    if (!invitation) {
      throw new AppError('VALIDATION_FAILED', 'Already invited', {
        fields: { email: 'alreadyInvited' },
      });
    }
    await writeAudit(
      {
        restaurantId: input.restaurantId,
        actorId: input.actorId,
        action: 'staff.invite',
        entity: 'staff_invitation',
        entityId: invitation.id,
        diff: { role: input.role },
      },
      tx,
    );
    // Last, so a failed email rolls the invitation back.
    const { error } = await adminAuth().inviteUserByEmail(input.email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/invite/accept`,
      data: { locale: input.locale, invited: true },
    });
    if (error) {
      if (error.code === 'email_exists') {
        throw new AppError('VALIDATION_FAILED', 'Address already registered', {
          fields: { email: 'alreadyRegistered' },
        });
      }
      throw error;
    }
    return { invitationId: invitation.id };
  });
}

export async function revokeInvitation(input: {
  restaurantId: string;
  invitationId: string;
  actorId: string;
}): Promise<void> {
  const rows = await rawDb()
    .update(staffInvitations)
    .set({ revokedAt: sql`now()` })
    .where(
      and(
        eq(staffInvitations.restaurantId, input.restaurantId),
        eq(staffInvitations.id, input.invitationId),
        isNull(staffInvitations.acceptedAt),
        isNull(staffInvitations.revokedAt),
      ),
    )
    .returning({ id: staffInvitations.id });
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'Invitation not found');
  await writeAudit({
    restaurantId: input.restaurantId,
    actorId: input.actorId,
    action: 'staff.invite_revoke',
    entity: 'staff_invitation',
    entityId: input.invitationId,
  });
}

/**
 * Turns the pending invitations of a just-verified address into memberships. Returns the roles
 * granted (empty when nothing was pending or everything expired).
 */
export async function acceptInvitations(input: {
  userId: string;
  email: string;
}): Promise<StaffRole[]> {
  return rawDb().transaction(async (tx) => {
    const pending = await tx
      .select({
        id: staffInvitations.id,
        restaurantId: staffInvitations.restaurantId,
        role: staffInvitations.role,
      })
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.email, input.email.toLowerCase()),
          isNull(staffInvitations.acceptedAt),
          isNull(staffInvitations.revokedAt),
          gt(staffInvitations.expiresAt, sql`now()`),
        ),
      )
      .for('update');
    if (pending.length === 0) return [];
    await tx
      .insert(memberships)
      .values(
        pending.map((invitation) => ({
          restaurantId: invitation.restaurantId,
          userId: input.userId,
          role: invitation.role,
        })),
      )
      .onConflictDoNothing();
    await tx
      .update(staffInvitations)
      .set({ acceptedAt: sql`now()` })
      .where(
        inArray(
          staffInvitations.id,
          pending.map((invitation) => invitation.id),
        ),
      );
    for (const invitation of pending) {
      await writeAudit(
        {
          restaurantId: invitation.restaurantId,
          actorId: input.userId,
          action: 'staff.invite_accept',
          entity: 'staff_invitation',
          entityId: invitation.id,
        },
        tx,
      );
    }
    return pending.map((invitation) => invitation.role);
  });
}

// ---------------------------------------------------------------- team page

export interface TeamOverview {
  members: {
    id: string;
    email: string;
    displayName: string | null;
    role: StaffRole;
    isActive: boolean;
  }[];
  invitations: { id: string; email: string; role: StaffRole; expiresAt: string }[];
  devices: {
    id: string;
    label: string;
    mode: DeviceMode;
    createdAt: string;
    lastSeenAt: string | null;
  }[];
  sessions: {
    id: string;
    deviceLabel: string;
    memberEmail: string;
    memberName: string | null;
    startedAt: string;
    expiresAt: string;
  }[];
  seats: { limit: number | null; left: number };
}

/**
 * Everything the Team page lists. Privileged read (member emails live in auth.users): the
 * caller has checked staff.manage for this restaurant.
 */
export async function loadTeam(restaurantId: string): Promise<TeamOverview> {
  const db = rawDb();
  const [members, invitations, devices, sessions, seats] = await Promise.all([
    db.execute<{
      id: string;
      email: string;
      display_name: string | null;
      role: StaffRole;
      is_active: boolean;
    }>(sql`
      select m.id, u.email, m.display_name, m.role, m.is_active
      from public.memberships m join auth.users u on u.id = m.user_id
      where m.restaurant_id = ${restaurantId}
      order by m.role, u.email`),
    db
      .select({
        id: staffInvitations.id,
        email: staffInvitations.email,
        role: staffInvitations.role,
        expiresAt: staffInvitations.expiresAt,
      })
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.restaurantId, restaurantId),
          isNull(staffInvitations.acceptedAt),
          isNull(staffInvitations.revokedAt),
          gt(staffInvitations.expiresAt, sql`now()`),
        ),
      )
      .orderBy(staffInvitations.createdAt),
    db
      .select({
        id: staffDevices.id,
        label: staffDevices.label,
        mode: staffDevices.mode,
        createdAt: staffDevices.createdAt,
        lastSeenAt: staffDevices.lastSeenAt,
      })
      .from(staffDevices)
      .where(and(eq(staffDevices.restaurantId, restaurantId), isNull(staffDevices.revokedAt)))
      .orderBy(staffDevices.createdAt),
    db.execute<{
      id: string;
      device_label: string;
      member_email: string;
      member_name: string | null;
      started_at: string;
      expires_at: string;
    }>(sql`
      select s.id, d.label as device_label, u.email as member_email,
        m.display_name as member_name, s.started_at, s.expires_at
      from public.staff_sessions s
      join public.staff_devices d on d.id = s.device_id
      join public.memberships m on m.id = s.membership_id
      join auth.users u on u.id = s.user_id
      where s.restaurant_id = ${restaurantId} and s.ended_at is null and s.expires_at > now()
        and d.revoked_at is null
      order by s.started_at desc`),
    staffSeats(restaurantId),
  ]);
  return {
    members: members.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
    })),
    invitations,
    devices,
    sessions: sessions.map((row) => ({
      id: row.id,
      deviceLabel: row.device_label,
      memberEmail: row.member_email,
      memberName: row.member_name,
      startedAt: new Date(row.started_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
    })),
    seats,
  };
}
