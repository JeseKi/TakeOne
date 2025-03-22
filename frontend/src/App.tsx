import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import { useEffect } from 'react';

import BaseInformation from './pages/BaseInfomation';
import Callback from './pages/Callback';
import { GetLoginUrl, GetUserInfo } from './Api';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {

    if (location.pathname === '/callback') {
      return;
    }

    if (location.pathname === '/login') {
      const redirectToLogin = async () => {
        try {
          const loginUrlResponse = await GetLoginUrl();
          window.location.replace(loginUrlResponse);
        } catch (error) {
          console.error("获取登录URL失败:", error);
        }
      };

      redirectToLogin();
    }
    
    const verifyTokenAndFetchUserInfo = async (refreshToken: string) => {
      try {
        await GetUserInfo(refreshToken);
  
      } catch (error: any) {
        console.error('Token 验证或获取用户信息失败', error);
        
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('userInfo');
        navigate('/login');
  
        return (
          <div>
            <h2>Token 验证或获取用户信息失败</h2>
            <p>请重新登录。</p>
            <p>正在重定向到登录页面...</p>
          </div>
        )
      }
    };

    const access_token = localStorage.getItem('access_token');

    if (!access_token) {
      navigate('/login');
    }
    else {
      verifyTokenAndFetchUserInfo(access_token);
    }

  }, [location.pathname]);

  return (
      <Routes>
        <Route path='/' element={<BaseInformation/ >} />
        <Route path='callback' element={<Callback />} />
        <Route path='login' element={<>正在重定向到登录页面...</>} />
      </Routes>
  )
}

export default App
