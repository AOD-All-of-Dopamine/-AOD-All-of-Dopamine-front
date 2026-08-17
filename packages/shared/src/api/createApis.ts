import type { ApiClients } from "./client";
import { createAuthApi, type AuthApi } from "./authApi";
import { createWorkApi, type WorkApi } from "./workApi";
import {
  createReviewApi,
  createInteractionApi,
  type ReviewApi,
  type InteractionApi,
} from "./interactionApi";
import { createRankingApi, type RankingApi } from "./rankingApi";
import { createCollectionApi, type CollectionApi } from "./collectionApi";

export interface Apis {
  authApi: AuthApi;
  workApi: WorkApi;
  reviewApi: ReviewApi;
  interactionApi: InteractionApi;
  rankingApi: RankingApi;
  collectionApi: CollectionApi;
}

export function createApis(clients: ApiClients): Apis {
  const { publicApi, privateApi } = clients;
  return {
    authApi: createAuthApi(publicApi, privateApi),
    workApi: createWorkApi(publicApi),
    reviewApi: createReviewApi(publicApi, privateApi),
    interactionApi: createInteractionApi(publicApi, privateApi),
    rankingApi: createRankingApi(publicApi),
    collectionApi: createCollectionApi(privateApi),
  };
}
