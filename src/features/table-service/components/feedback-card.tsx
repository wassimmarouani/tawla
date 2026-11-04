'use client';

import { useId, useState } from 'react';
import { classes } from '@/lib/classes';
import { publicApi } from './public-api';

export interface FeedbackLabels {
  title: string;
  rating: string;
  /** Accessible names of the five stars, 1 to 5. */
  stars: readonly string[];
  comment: string;
  commentHint: string;
  send: string;
  sending: string;
  later: string;
  thanks: string;
  review: string;
  reviewHint: string;
  failed: string;
  close: string;
}

/**
 * Rating after the bill (spec 02 "After service"): 1–5 stars and an optional comment, seen by
 * managers only. 4–5 stars invite a Google review when the venue set a link. Never blocking:
 * "Later" closes it.
 */
export function FeedbackCard({
  labels,
  reviewUrl,
  onFinished,
}: {
  labels: FeedbackLabels;
  reviewUrl: string | null;
  onFinished: () => void;
}) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'failed' | 'sent'>('form');

  if (phase === 'sent') {
    return (
      <section
        aria-labelledby={`${id}-thanks`}
        className="flex flex-col gap-2 rounded-xl bg-brand-subtle p-4 text-brand-on-subtle"
      >
        <p id={`${id}-thanks`} role="status" className="text-md font-semibold">
          {labels.thanks}
        </p>
        {rating >= 4 && reviewUrl ? (
          <>
            <p className="text-sm">{labels.reviewHint}</p>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onFinished}
              className="flex min-h-11 items-center justify-center rounded-full bg-brand-solid px-4 text-md font-semibold text-brand-on-solid outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {labels.review}
            </a>
          </>
        ) : null}
        <button
          type="button"
          onClick={onFinished}
          className="mx-auto min-h-11 rounded-full px-4 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {labels.close}
        </button>
      </section>
    );
  }

  return (
    <form
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (rating === 0) return;
        setPhase('sending');
        void publicApi.feedback(rating, comment).then((result) => {
          setPhase(result.ok ? 'sent' : 'failed');
        });
      }}
    >
      <h2 id={`${id}-title`} className="text-md font-semibold text-foreground">
        {labels.title}
      </h2>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{labels.rating}</legend>
        <div className="flex justify-center gap-1">
          {labels.stars.map((name, index) => {
            const value = index + 1;
            return (
              <label
                key={name}
                className="grid size-11 cursor-pointer place-items-center rounded-full has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name={`${id}-rating`}
                  value={value}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value);
                  }}
                  className="sr-only"
                  aria-label={name}
                />
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={classes(
                    'size-8',
                    value <= rating ? 'fill-brand-solid text-brand-solid' : 'text-muted-foreground',
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                >
                  <path d="m12 2.8 2.84 5.75 6.35.93-4.6 4.48 1.09 6.32L12 17.29l-5.68 2.99 1.09-6.32-4.6-4.48 6.35-.93z" />
                </svg>
              </label>
            );
          })}
        </div>
      </fieldset>
      {rating > 0 ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          {labels.comment}
          <textarea
            dir="auto"
            rows={2}
            maxLength={500}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            aria-describedby={`${id}-hint`}
            className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-md font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span id={`${id}-hint`} className="text-xs font-normal text-muted-foreground">
            {labels.commentHint}
          </span>
        </label>
      ) : null}
      {phase === 'failed' ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {labels.failed}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onFinished}
          className="min-h-11 rounded-full px-4 text-md font-medium text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {labels.later}
        </button>
        <button
          type="submit"
          disabled={rating === 0 || phase === 'sending'}
          aria-busy={phase === 'sending' || undefined}
          className="min-h-11 rounded-full bg-brand-solid px-4 text-md font-semibold text-brand-on-solid outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === 'sending' ? labels.sending : labels.send}
        </button>
      </div>
    </form>
  );
}
