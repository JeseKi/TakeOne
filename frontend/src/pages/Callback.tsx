import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../config'; // 假设配置文件路径不变
import axios from 'axios';
import { GetTokenResponse } from '../Api';

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
    const state = searchParams.get('state');

    const tokenResponse = async (code: string, state: string) => {
      try{
        const token = await GetTokenResponse(code, state);
        return token;
      } catch (error) {
        console.error("获取token失败:", error);
        throw error;
      }
    }

    if (code && state) {
      setLoading(true);
      tokenResponse(code, state)
        .then((token) => {
        localStorage.setItem('refresh_token', token.refresh_token);
        localStorage.setItem('access_token', token.access_token);
        localStorage.setItem('id_token', token.id_token);
      })
        .catch((error) => {
        console.error("获取token失败:", error);
        setError(`获取token失败: ${error.message}`);
      })
        .finally(() => {
        setLoading(false);
        verifyTokenAndFetchUserInfo(localStorage.getItem('access_token')!);
      });

    } else {
      setError('未收到授权码');
      setLoading(false);
    }
  }, [searchParams, navigate]);

  const verifyTokenAndFetchUserInfo = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<UserInfoResponse>(
        `${config.backendUrl}/api/user_info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const userInfo: UserInfoResponse = response.data;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      navigate('/');

    } catch (error: any) {
      console.error('Token 验证或获取用户信息失败', error);
      setError(`Token 验证或获取用户信息失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (loading) {
    return (
      <div>
        <h2>正在处理登录回调...</h2>
        <p>请稍候，正在验证身份并获取用户信息...</p>
      </div>
    );
  }

  return null;
};

export default Callback;