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
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h2 className="text-xl font-semibold mb-2">正在处理登录回调...</h2>
        <p className="text-gray-600 dark:text-gray-300">请稍候，正在验证身份并获取用户信息...</p>
        <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="p-4 mb-4 text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100 rounded-lg max-w-md">
          <h3 className="text-lg font-medium mb-2">登录错误</h3>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => navigate('/login')}
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Callback;