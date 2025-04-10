import axios from "axios";
import { config } from "./config";

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    scope: string;
    token_type: string;
    expires_in: number;
  }

export interface UserInfoResponse {
    id: string;
    name: string;
    displayName: string;
    email: string;
    preferredUsername: string;
}

export interface BaseInformation {
    max_living_expenses_from_parents: string | '';
    enough_savings_for_college: string | '';
    pocket_money_usage: string | '';
    willing_to_repeat_high_school_for_money: string | '';
    city_tier: string | '';
    parents_in_public_sector: string | '';
    has_stable_hobby: string | '';
    self_learning_after_gaokao: string | '';
    proactive_in_competitions: string | '';
    likes_reading_extracurricular_books: string | '';
}

export enum GenerateType {
    CHOICES = "choices",
    REPORT = "report",
    ROUND = "round"
}

export interface ChoiceResponse {
    major_id: string;
    major_name: string;
    description: string;
    appearance_index: number;
    is_winner_in_comparison?: boolean | null;
}

export interface RoundResponse {
    round_number: number;
    status: string;
    current_round_majors: string[];
    appearances: ChoiceResponse[];
}

export interface MajorChoice {
    major_id: string;
    is_winner_in_comparison?: boolean | null;
}

export interface MajorChoiceRequest {
    choices: [MajorChoice, MajorChoice] | null;
}

export interface PostChoicesResponse {
    generate_type: GenerateType;
}

export interface GetChoicesResponse {
    choices: [ChoiceResponse, ChoiceResponse];
}

export interface GetRoundResponse {
    current_round_number: number;
    current_round_majors: string[];
    choices: [ChoiceResponse, ChoiceResponse];
}

export interface GetReportResponse {
    final_three_majors: string[];
    final_three_majors_report: string[];
    final_recommendation: string;
}

interface MajorChoiceResult {
    name: string;
    descriptions: string[];
    appearance_order: number[];
}

export interface SessionContentResponse {
    base_information: BaseInformation;
    major_choices_result: MajorChoiceResult[];
    chosen_sequence: number[];
    rounds?: RoundResponse[];
    current_round_number?: number;
    status?: string;
    final_major_name?: string;
    report?: GetReportResponse;
}

export interface SaveAndNextResponse {
    status: string;
    operation: string;
    data: GetChoicesResponse | GetRoundResponse | GetReportResponse;
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

const GetSessionsID = async (accessToken: string): Promise<string[] | null> => {
    try {
        const response = await axios.get<string[]>(
            `${config.backendApiUrl}/sessions`,
            {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            }
        );

        return response.data;
    }
    catch (error: any) {
        console.error('获取对话列表失败', error);
        throw error;
    }
}

const GetSessionContent = async (session_id: string, accessToken: string): Promise<SessionContentResponse> => {
    try {
        const response = await axios.get<SessionContentResponse>(
            `${config.backendApiUrl}/sessions/${session_id}`,
            {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            }
        );

        return response.data;
    }
    catch (error: any) {
        console.error('获取对话内容失败', error);
        throw error;
    }
}

const SaveAndNext = async (session_id: string, choices: MajorChoiceRequest | null, accessToken: string): Promise<SaveAndNextResponse> => {
    try {
        const response = await axios.post<SaveAndNextResponse>(
            `${config.backendApiUrl}/options/save_and_next/${session_id}`,
            choices || { choices: null },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('保存选择并获取下一步失败', error);
        throw error;
    }
}

const PostBaseInformation = async (data: BaseInformation, accessToken: string): Promise<string> => {
    try {

        const checkRequiredFields = (data: BaseInformation) => {
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

export { GetLoginUrl, GetTokenResponse, GetUserInfo, PostBaseInformation, GetSessionsID, GetSessionContent, SaveAndNext };