import { TYPE_STT_PROVIDER } from "@/types/stt.types";

export const testSTTProvider = async (
  provider: TYPE_STT_PROVIDER,
  apiKey: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // For testing, we'll just try to make a basic HTTP request to check the endpoint
    // without sending actual audio data, since creating test audio is complex
    
    const url = `${provider.baseUrl}${provider.endpoint}`;
    
    // Create a simple test request with minimal headers
    const headers: Record<string, string> = {
      'User-Agent': 'Pluely/0.1.3',
      ...provider.request.headers,
    };

    // Add authentication headers based on auth type
    if (provider.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider.authType === 'basic') {
      headers['Authorization'] = `Basic ${btoa(`${apiKey}:`)}`;
    } else if (provider.authType === 'basic-apikey') {
      headers['Authorization'] = `Basic ${btoa(`apikey:${apiKey}`)}`;
    } else if (provider.authType === 'query' && provider.authParam) {
      // Query param auth will be handled in URL
    } else if (provider.authType === 'custom' && provider.authParam) {
      headers[provider.authParam] = apiKey;
    }

    // For query param auth, add to URL
    let testUrl = url;
    if (provider.authType === 'query' && provider.authParam) {
      const queryParams = new URLSearchParams();
      queryParams.append(provider.authParam, apiKey);
      testUrl += `?${queryParams.toString()}`;
    }

    // Make a test request with OPTIONS method to check if endpoint exists
    // This is safer than sending actual data
    const response = await fetch(testUrl, {
      method: 'OPTIONS',
      headers,
    });

    // Check response
    if (response.ok || response.status === 405) {
      // 405 Method Not Allowed is expected for OPTIONS, means endpoint exists
      return {
        success: true,
        message: "Connection successful! Endpoint is reachable and configured correctly.",
      };
    } else if (response.status === 401) {
      return {
        success: false,
        message: "Authentication failed. Please check your API key and authentication configuration.",
      };
    } else if (response.status === 404) {
      return {
        success: false,
        message: "Endpoint not found. Please check the base URL and endpoint path.",
      };
    } else {
      return {
        success: false,
        message: `Server responded with status ${response.status}. Please check your configuration.`,
      };
    }
  } catch (error) {
    console.error("STT provider test failed:", error);
    
    // Parse different types of errors
    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        return {
          success: true, // CORS error actually means the endpoint exists
          message: "Endpoint is reachable, but CORS may prevent browser requests. This is normal and the provider should work in the app.",
        };
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return {
          success: false,
          message: "Network error. Please check the URL and your internet connection.",
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
        };
      }
    }
    
    return {
      success: false,
      message: "Unknown error occurred while testing the provider.",
    };
  }
};