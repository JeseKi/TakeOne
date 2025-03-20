import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { casdoorConfig } from './casdoorConfig';
import axios, { AxiosError } from 'axios';

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

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      setLoading(true);
      const { casedoorTokenEndpoint, clientId, clientSecret } = casdoorConfig;

      axios
        .post<TokenResponse>(casedoorTokenEndpoint, {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
        })
        .then((response: { data: TokenResponse; }) => {
          const tokenResponse: TokenResponse = response.data;
          localStorage.setItem('access_token', tokenResponse.access_token);
          localStorage.setItem('refresh_token', tokenResponse.refresh_token);
          localStorage.setItem('id_token', tokenResponse.id_token);

          fetchUserInfo(tokenResponse.access_token)
            .then((userInfo) => {
              console.log('用户信息:', userInfo);
              localStorage.setItem('userInfo', JSON.stringify(userInfo));
              navigate('/');
            })
            .catch((err) => {
              console.error('获取用户信息失败', err);
              setError('获取用户信息失败');
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch((error: AxiosError) => {
          console.error('Token 交换失败', error);
          setError(`Token 交换失败: ${error.message}`);
          setLoading(false);
        });
    } else {
      setError('未收到授权码');
      setLoading(false);
    }
  }, [searchParams, navigate]);

  const fetchUserInfo = async (accessToken: string): Promise<UserInfoResponse> => {
    const { casdoorUrl } = casdoorConfig;
    try {
      const response = await axios.get<UserInfoResponse>(`${casdoorUrl}/api/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error:any) {
      console.error("获取用户信息失败", error);
      throw new Error(`获取用户信息失败: ${error.message}`);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (loading) {
    return (
      <div>
        <h2>正在处理登录回调...</h2>
        <p>请稍候，正在获取用户信息...</p>
      </div>
    );
  }

  return null;
};

export default Callback;