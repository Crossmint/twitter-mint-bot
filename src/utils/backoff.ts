import { backOff } from "exponential-backoff";

/*
 * Documentation: https://www.npmjs.com/package/exponential-backoff
 */

export function backOffFew<T>(
    call: () => Promise<T>,
    isRetriable: (err: Error) => boolean = (err: Error) => true
): Promise<T> {
    return backOff(call, {
        numOfAttempts: 3,
        timeMultiple: 3,
        startingDelay: 500,
        retry: loggingException(isRetriable),
    });
}

export function backOffSlow<T>(
    call: () => Promise<T>,
    isRetriable: (err: Error) => boolean = (err: Error) => true
): Promise<T> {
    return backOff(call, {
        numOfAttempts: 5,
        timeMultiple: 3,
        startingDelay: 300,
        retry: loggingException(isRetriable),
    });
}

function loggingException(isRetriable: (err: Error) => boolean) {
    return (e: any, attemptNumber: number) => {
        const retry = isRetriable(e);

        console.warn(
            `Execution failed on attempt ${attemptNumber}. ${
                retry ? "Will retry" : "Will NOT retry"
            }`
        );
        console.warn(e);
        return retry;
    };
}
