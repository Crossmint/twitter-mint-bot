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

const BOT_TREASURY_PUBLICKEY = "0xA6BA3271984Bdb79dA9C09Ea030044573d3910B0";

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
                    `https://staging.crossmint.io/api/2022-06-09/nfts`,
                    {
                        mainnet: false,
                        metadata,
                        recipient: `${recipientInfo.type}:${
                            recipientInfo.value
                        }${recipientInfo.type === "email" ? ":poly" : ""}`,
                    },
                    {
                        "x-project-id": process.env.CROSSMINT_PROJECT_ID!,
                        "x-client-secret": process.env.CROSSMINT_CLIENT_SECRET!,
                    }
                );
            });

            console.log(
                `[Twitter-Mint-Bot] Mint request ${res.requestId} initiated: `,
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

    static async getRequestStatus(requestId: string) {
        const res = await fetchGetJSON(
            `https://staging.crossmint.io/api/2022-06-09/requests/${requestId}/status`,
            {
                "x-project-id": process.env.CROSSMINT_PROJECT_ID!,
                "x-client-secret": process.env.CROSSMINT_CLIENT_SECRET!,
            }
        );

        return res;
    }

    static async awaitStatusSuccess(requestId: string) {
        let status = "pending";

        return await new Promise<any>((resolve) => {
            const interval = setInterval(async () => {
                const res = await this.getRequestStatus(requestId);

                console.log(
                    `[Twitter-Mint-Bot] Mint request ${requestId} status: `,
                    JSON.stringify(res, undefined, 2)
                );
                status = res.status;

                if (status !== "pending") {
                    resolve(res);
                    clearInterval(interval);
                }
            }, 5000);
        });
    }
}