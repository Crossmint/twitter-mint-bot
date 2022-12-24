import Client from "twitter-api-sdk";
import * as twitter from "twitter-api-sdk";
import { RecipientRequest } from "../utils";
import { fetchGetJSON, fetchPostJSON } from "../utils/fetch";
import { backOffFew } from "../utils/backoff";

import dotenv from "dotenv";

dotenv.config();

export interface Metadata extends TweetMetadata {
    name: string;
    image: string;
    description: string;
    attributes: TweetMetadata;
}

export interface TweetMetadata {
    author_id: string;
    text: string;
    tweetedAt: string;
    likes: number;
    retweets: number;
}

export default class MintAPIAdapter {
    static async mintTweetNFT(
        twitterClient: Client,
        tweetImageURL: string,
        referencedTweetId: string,
        recipientInfo: RecipientRequest
    ) {
        const referencedTweet = await backOffFew(async () => {
            return await twitterClient.tweets.findTweetById(referencedTweetId, {
                "tweet.fields": ["author_id", "created_at", "public_metrics"],
            });
        });

        const metadata = {
            name: "Twitter Mint Bot",
            image: tweetImageURL,
            description: referencedTweet.data?.text,
            attributes: this.parseReferencedTweetToMetadata(referencedTweet),
        } as Metadata;

        try {
            const res = await backOffFew(async () => {
                return await fetchPostJSON(
                    `https://staging.crossmint.io/api/2022-06-09/collections/default-${recipientInfo.chain}/nfts`,
                    {
                        mainnet: false,
                        metadata,
                        recipient: `${recipientInfo.type === "email" ? `email` : recipientInfo.chain}:${recipientInfo.value}${recipientInfo.type === "email" ? `:${recipientInfo.chain}` : ""}`,

                    },
                    {
                        "x-project-id": process.env.CROSSMINT_PROJECT_ID!,
                        "x-client-secret": process.env.CROSSMINT_CLIENT_SECRET!,
                    }
                );
            });

            console.log(
                `[Twitter-Mint-Bot] Mint request ${res.id} initiated: `,
                JSON.stringify(res, undefined, 2)
            );

            return res;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    private static parseReferencedTweetToMetadata(
        referencedTweet: twitter.types.components["schemas"]["Get2TweetsIdResponse"]
    ) {
        return {
            author_id: referencedTweet.data?.author_id,
            tweetedAt: referencedTweet.data?.created_at!,
            text: referencedTweet.data?.text!,
            likes: referencedTweet.data?.public_metrics?.like_count!,
            retweets: referencedTweet.data?.public_metrics?.retweet_count!,
        } as TweetMetadata;
    }

    static async getRequestStatus(requestId: string, requestChain: string) {
        const res = await fetchGetJSON(
            `https://staging.crossmint.io/api/2022-06-09/collections/default-${requestChain}/nfts/${requestId}`,
            {
                "x-project-id": process.env.CROSSMINT_PROJECT_ID!,
                "x-client-secret": process.env.CROSSMINT_CLIENT_SECRET!,
            }
        );

        return res;
    }

    static async awaitStatusSuccess(requestId: string, requestChain: string) {
        let status = "pending";

        return await new Promise<any>((resolve) => {
            const interval = setInterval(async () => {
                const res = await this.getRequestStatus(requestId, requestChain);

                console.log(
                    `[Twitter-Mint-Bot] Mint request ${requestId} status: `,
                    JSON.stringify(res, undefined, 2)
                );
                status = res.onChain.status;

                if (status !== "pending") {
                    console.log("[Twitter-Mint-Bot] Resolved status: " + status);
                    resolve(res);
                    clearInterval(interval);
                }
            }, 3000);
        });
    }
}
