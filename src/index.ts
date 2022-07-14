import dotenv from "dotenv";
import { Client } from "twitter-api-sdk";

dotenv.config();

if (!process.env.TWITTER_BEARER_TOKEN) {
    throw new Error("Missing Twitter bearer token in env");
}

const twitterClient = new Client(process.env.TWITTER_BEARER_TOKEN!);

// console.log(twitterClient);
