export type CreateShareLinkInput = {
    queryString: string;
    title?: string;
    summary?: string;
  };
  
  type CreateShareLinkResponse = {
    code: string;
    shortUrl: string;
  };
  
  function normalizeQueryString(queryString: string): string {
    return queryString.trim().replace(/^\?+/, "");
  }
  
  export async function createShortShareLink(
    input: CreateShareLinkInput
  ): Promise<CreateShareLinkResponse> {
    const queryString = normalizeQueryString(input.queryString);
  
    if (!queryString) {
      throw new Error("Missing query string");
    }
  
    const response = await fetch("/api/create-share-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryString,
        title: input.title ?? "PressureCal result",
        summary: input.summary ?? null,
      }),
    });
  
    const data = (await response.json().catch(() => null)) as CreateShareLinkResponse & {
      error?: string;
    } | null;
  
    if (!response.ok || !data?.shortUrl) {
      throw new Error(data?.error || "Unable to create share link");
    }
  
    return {
      code: data.code,
      shortUrl: data.shortUrl,
    };
  }
  
  export async function copyTextToClipboard(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt("Copy this text:", value);
    }
  }
  
  export async function shareUrlWithNavigator(args: {
    url: string;
    title?: string;
    text?: string;
  }): Promise<boolean> {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }
  
    await navigator.share({
      url: args.url,
      title: args.title,
      text: args.text,
    });
  
    return true;
  }
  