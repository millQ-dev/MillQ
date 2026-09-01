import { z } from 'zod';

export const RecommendationStatus = {
  Generated: 'GENERATED',
  Accepted: 'ACCEPTED',
  Rejected: 'REJECTED',
  Expired: 'EXPIRED',
  Superseded: 'SUPERSEDED',
} as const;

export type RecommendationStatusName =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

export const recommendationSchema = z.object({
  recommendationId: z.string().uuid(),
  recommendationType: z.string().min(1),
  target: z.record(z.unknown()),
  generatedAt: z.string().datetime(),
  evidenceFactIds: z.array(z.string().uuid()),
  evidenceRevisionIds: z.array(z.string().uuid()).optional(),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  expectedImpact: z.record(z.unknown()).optional(),
  status: z.enum([
    RecommendationStatus.Generated,
    RecommendationStatus.Accepted,
    RecommendationStatus.Rejected,
    RecommendationStatus.Expired,
    RecommendationStatus.Superseded,
  ]),
  humanDecisionAt: z.string().datetime().optional(),
  humanDecisionBy: z.string().uuid().optional(),
  resultingOperationalCommandId: z.string().uuid().optional(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

/** Command DTO produced when user accepts a recommendation — executed by Operational Core only */
export const operationalCommandRequestSchema = z.object({
  commandId: z.string().uuid(),
  commandType: z.string().min(1),
  sourceRecommendationId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  payload: z.record(z.unknown()),
});

export type OperationalCommandRequest = z.infer<typeof operationalCommandRequestSchema>;
