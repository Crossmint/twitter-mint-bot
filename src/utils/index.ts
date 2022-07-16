import getEmails from "get-emails";

export interface RecipientRequest {
    value: string;
    type: "email" | "poly";
}

export function parseRecipientFromTweetText(
    text: string
): RecipientRequest | undefined {
    const emails = [...getEmails(text)];

    if (emails.length > 0) {
        return { value: emails[0], type: "email" };
    }

    const evmAddressMatches = text.match(`0x[a-fA-F0-9]{40}`);

    if (evmAddressMatches && evmAddressMatches.length > 0) {
        return { value: evmAddressMatches[0], type: "poly" };
    }

    return undefined;
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
