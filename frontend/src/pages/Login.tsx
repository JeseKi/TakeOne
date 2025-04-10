import { useEffect } from 'react';
import { GetLoginUrl } from '../Api';

function Login() {
    useEffect(() => {
      const redirectToLogin = async () => {
        try {
          const loginUrlResponse = await GetLoginUrl();
          window.location.replace(loginUrlResponse);
        } catch (error) {
          console.error("获取登录URL失败:", error);
        }
      };
  
      redirectToLogin();
    }, []);
  
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg font-medium animate-pulse">正在重定向到登录页面...</div>
      </div>
    );
  }

export default Login;