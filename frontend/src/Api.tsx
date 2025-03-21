import axios from "axios";
import { config } from "./config";

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    scope: string;
    token_type: string;
    expires_in: number;
  }

const GetLoginUrl = async (): Promise<string> => {
    const response = await axios.post<string>(`${config.backendUrl}/api/login`);
    return response.data;
};

const GetTokenResponse = async (code: string, state: string): Promise<TokenResponse> => {
    try {
        const response = await axios.post<TokenResponse>(`${config.backendUrl}/api/callback`, {
            code: code,
            state: state,
        });
        return response.data;
    } catch (error) {
        console.error("获取token失败:", error);
        throw error;
    }
};

export { GetLoginUrl , GetTokenResponse };