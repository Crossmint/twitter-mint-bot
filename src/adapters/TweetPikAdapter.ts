import dotenv from "dotenv";
import { fetchPostJSON } from "../utils/fetch";

dotenv.config();

export default class TweetPikAdapter {
    static baseURL = "https://tweetpik.com/api/images";

    static async createImageURLForTweet(tweetId: string) {
        console.log(
            `[Twitter-Mint-Bot] Generating image for tweet with id:`,
            tweetId
        );
        try {
            const res = await fetchPostJSON(
                "https://tweetpik.com/api/images",
                {
                    tweetId,
                    dimension: "autoSize",
                },
                {
                    authorization: process.env.TWEETPIK_API_KEY!,
                }
            );

            return res.url as string;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }
}
