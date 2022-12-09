import dotenv from "dotenv";
import { backOff } from "exponential-backoff";
import fetch from "node-fetch";
import { Client } from "twitter-api-sdk";
import { TwitterApi } from "twitter-api-v2";
import MintAPIAdapter from "./adapters/MintAPIAdapter";
import TweetPikAdapter from "./adapters/TweetPikAdapter";
import { parseRecipientFromTweetText } from "./utils";
import { backOffFew } from "./utils/backoff";

import { uuid } from "uuidv4";

dotenv.config();

if (!process.env.TWITTER_BEARER_TOKEN) {
    throw new Error("Missing Twitter bearer token in env");
}

if (!process.env.BOT_TWITTER_USERNAME) {
    throw new Error("Missing our Twitter username in env");
}

const twitterClient = new Client(process.env.TWITTER_BEARER_TOKEN!);

// Maxwell: Rules are saved until they are deleted, so no need to rerun this. I've added a rule that our stream will only contain tweets that mention @${process.env.BOT_TWITTER_USERNAME}
async function init() {
    console.log("[Twitter-Mint-Bot] Starting up...");

    // await twitterClient.tweets.addOrDeleteRules({
    //     add: [
    //         {
    //             value: `@${process.env.BOT_TWITTER_USERNAME}`,
    //             tag: "mentions the bot",
    //         },
    //     ],
    // });
}

async function main() {
    // Initilize whatever we need
    await init();

    const stream = twitterClient.tweets.searchStream({
        "tweet.fields": ["referenced_tweets"],
    });

    for await (const tweet of stream) {
        // Tweet mentions the bot
        if (
            tweet.data?.referenced_tweets &&
            tweet.data?.referenced_tweets.length > 0
        ) {
            console.log(
                "[Twitter-Mint-Bot] New mint request",
                JSON.stringify(tweet, undefined, 2)
            );

            try {
                const referencedTweetId = tweet.data?.referenced_tweets[0].id;
                // Tweet mentions the bot and are replying to another tweet
                const recipientInfo = parseRecipientFromTweetText(
                    tweet.data.text
                );

                console.log(
                    `[Twitter-Mint-Bot] Parsed recipient info: ${JSON.stringify(
                        recipientInfo
                    )}`
                );

                if (!recipientInfo) {
                    continue;
                }

                const tweetImageURL =
                    await TweetPikAdapter.createImageURLForTweet(
                        referencedTweetId
                    );

                console.log(
                    `[Twitter-Mint-Bot] Created image for tweet: ${tweet.data.id}, url: ${tweetImageURL}`
                );
                if (!tweetImageURL) {
                    continue;
                }

                const mintTweetRequestData = await MintAPIAdapter.mintTweetNFT(
                    twitterClient,
                    tweetImageURL!,
                    referencedTweetId,
                    recipientInfo
                );

                if (!mintTweetRequestData) {
                    continue;
                }
                // 15 sec
                const statusRequestData = await backOffFew(async () => {
                    return await MintAPIAdapter.awaitStatusSuccess(
                        mintTweetRequestData.id
                    );
                });

                if (
                    !statusRequestData ||
                    statusRequestData?.onChain.status !== "success"
                ) {
                    continue;
                }

                const client = new TwitterApi({
                    appKey: process.env.TWITTER_APP_KEY!,
                    appSecret: process.env.TWITTER_APP_SECRET!,
                    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
                    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
                });

                const mediaId = await backOffFew(async () => {
                    return await client.v1.uploadMedia(
                        Buffer.from(
                            await (await fetch(tweetImageURL)).arrayBuffer()
                        ),
                        {
                            mimeType: "image/png",
                        }
                    );
                });

                const tweetedReply = await backOffFew(async () => {
                    return await client.v2.tweet(
                        "Thanks for minting, degen! Claim your NFT @crossmint\n\n" +
                            `https://mumbai.polygonscan.com/tx/${statusRequestData.onChain.txId}\n`+
                            `https://testnets.opensea.io/assets/mumbai/${statusRequestData.onChain.contractAddress}/${statusRequestData.onChain.tokenId}`,
                        {
                            reply: {
                                in_reply_to_tweet_id: tweet.data?.id!,
                            },
                            media: {
                                media_ids: [mediaId],
                            },
                        }
                    );
                });
                console.log("[Twitter-Mint-Bot] Posted a response to a tag");
            } catch (e) {
                console.log(e);
            }
        }
    }
}

main();
