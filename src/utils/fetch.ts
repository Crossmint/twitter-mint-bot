import fetch from "node-fetch";

type Methods = "GET" | "POST" | "PUT" | "DELETE";

export const getFetchPostConfig = (
    method: Methods,
    data?: {},
    headers?: {}
): RequestInit => ({
    // Default options are marked with *
    method, // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
        "Content-Type": "application/json",
        ...headers,
        // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data || {}), // body data type must match "Content-Type" header
});

export async function fetchGetJSON(url: string, headers?: {}) {
    try {
        const response = await fetch(url, { headers });
        return await parseJsonFetchResponse(response as any);
    } catch (err: any) {
        throw new Error(`GET ${url}: ${err}`);
    }
}

export async function fetchPostJSON(url: string, data?: {}, headers?: {}) {
    try {
        const response = await fetch(
            url,
            getFetchPostConfig("POST", data, headers) as any
        );
        return await parseJsonFetchResponse(response as any);
    } catch (err: any) {
        throw new Error(`POST ${url}: ${err}`);
    }
}

export async function fetchPutJSON(url: string, data?: {}, headers?: {}) {
    try {
        const response = await fetch(
            url,
            getFetchPostConfig("PUT", data, headers) as any
        );
        return await parseJsonFetchResponse(response as any);
    } catch (err: any) {
        throw new Error(`PUT ${url}: ${err}`);
    }
}

export async function fetchDeleteJSON(url: string, data?: {}, headers?: {}) {
    try {
        const response = await fetch(
            url,
            getFetchPostConfig("DELETE", data, headers) as any
        );
        return await parseJsonFetchResponse(response as any);
    } catch (err: any) {
        throw new Error(`DELETE ${url}: ${err}`);
    }
}

// TODO reuse fetchGetJSON
export async function fetchGetActionJSON(url: string) {
    return await fetch(url, {
        headers: {
            Authorization: process.env.ACTIONS_SECRET_KEY!,
        },
    }).then((res) => res.json());
}

async function parseJsonFetchResponse(response: Response) {
    if (response.ok) {
        return await response.json();
    } else {
        const errorText = await response.text();
        throw new Error(`[${response.status}] ${errorText}`);
    }
}
