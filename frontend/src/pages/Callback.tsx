import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GetTokenResponse, GetUserInfo } from '../Api';

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setError('未收到授权码或 state');
        setLoading(false);
        return;
      }

      try {
        const token = await GetTokenResponse(code, state);
        const accessToken = token.access_token;
        localStorage.setItem('access_token', accessToken);

        const userInfo = await GetUserInfo(accessToken);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        window.location.href = '/';
      } catch (error: any) {
        console.error('认证失败:', error);
        setError(`认证失败: ${error.message}`);

        localStorage.removeItem('access_token');
        localStorage.removeItem('userInfo');

        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div>
        <h2>正在处理登录回调...</h2>
        <p>请稍候，正在验证身份并获取用户信息...</p>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return null;
};

export default Callback;