import getEmails from "get-emails";

export interface RecipientRequest {
    value: string;
    type: "email" | "polygon" | "solana";
    chain: "polygon" | "solana";
}

export function parseRecipientFromTweetText(
    text: string
): RecipientRequest | undefined {
    const emails = [...getEmails(text)];

    let solanaFlag = text.match(/--solana/gi);
    if (solanaFlag) {
        if (emails.length > 0) {
            return { value: emails[0], type: "email", chain: "solana" };
        }

        const solAddressMatches = text.match((`^[1-9A-HJ-NP-Za-km-z]{32,44}$`) );
        console.log(solAddressMatches);
        if (solAddressMatches && solAddressMatches.length > 0) {
            return { value: solAddressMatches[0], type: "solana", chain: "solana" };
        }} 
    else { 
        if (emails.length > 0) {
            return { value: emails[0], type: "email", chain: "polygon" };
        }
        
        const evmAddressMatches = text.match(`0[xX][a-fA-F0-9]{40}`);
        if (evmAddressMatches && evmAddressMatches.length > 0) {
            return { value: evmAddressMatches[0], type: "polygon", chain: "polygon" };
        }
    }

    

    return undefined;
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
