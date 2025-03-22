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

interface UserInfoResponse {
    id: string;
    name: string;
    displayName: string;
    email: string;
    preferredUsername: string;
}

interface BaseInformationRequest {
    max_living_expenses_from_parents: string;
    enough_savings_for_college: string;
    pocket_money_usage: string;
    willing_to_repeat_high_school_for_money: string;
    city_tier: string;
    parents_in_public_sector: string;
    has_stable_hobby: string;
    self_learning_after_gaokao: string;
    proactive_in_competitions: string;
    likes_reading_extracurricular_books: string;
}

export class MissingFieldsError extends Error {
    public missingFields: string[];

    constructor(message: string, missingFields?: string[]) {
        super(message);
        this.name = 'MissingFieldsError';
        this.missingFields = missingFields || [];

        Object.setPrototypeOf(this, MissingFieldsError.prototype);
    }
}

const GetLoginUrl = async (): Promise<string> => {
    const response = await axios.post<string>(`${config.backendApiUrl}/auth/login`);
    return response.data;
};

const GetTokenResponse = async (code: string, state: string): Promise<TokenResponse> => {
    try {
        const response = await axios.post<TokenResponse>(`${config.backendApiUrl}/auth/callback`, {
            code: code,
            state: state,
        });
        return response.data;
    } catch (error) {
        console.error("获取token失败:", error);
        throw error;
    }
};

const GetUserInfo = async (accessToken: string): Promise<UserInfoResponse> => {
    try {
        const response = await axios.get<UserInfoResponse>(
            `${config.backendApiUrl}/auth/user_info`,
            {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            }
        );

        const userInfo: UserInfoResponse = response.data;
        return userInfo;
    } catch (error: any) {
        console.error('Token 验证或获取用户信息失败', error);
        throw error;
    }
}

const PostBaseInformation = async (data: BaseInformationRequest, accessToken: string): Promise<string> => {
    try {

        const checkRequiredFields = (data: BaseInformationRequest) => {
            const emptyFields: string[] = [];
            for (const [key, value] of Object.entries(data)) {
                if (value === '') {
                    emptyFields.push(key);
                }
            }
            if (emptyFields.length > 0) {
                const fieldNames = emptyFields.join(', ');
                throw new MissingFieldsError(`以下字段为空: ${fieldNames}`, emptyFields);
            }
        };

        checkRequiredFields(data);

        return await axios.post(
                `${config.backendApiUrl}/base_information`,
                data,
                {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        ) .then((response) => {
          const session_uuid = response.data;
          return session_uuid;  
        }).catch((error) => {
          console.error("提交基本信息失败:", error);
          throw error;
        });
    } catch (error: any) {
        throw error;
    }
}

export { GetLoginUrl , GetTokenResponse , GetUserInfo , PostBaseInformation};
export type { TokenResponse , UserInfoResponse , BaseInformationRequest };