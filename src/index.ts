import dotenv from "dotenv";
import { Client } from "twitter-api-sdk";

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
        expansions: ["entities.mentions.username"],
    });

    for await (const tweet of stream) {
        // All tweets here will mention our bot
        console.log(JSON.stringify(tweet, undefined, 2));
    }
}

main();
