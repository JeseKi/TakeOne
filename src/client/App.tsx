import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Callback from './pages/Callback';
import { GetUserInfo } from './Api';
import Chat from './pages/Chats';
import Login from './pages/Login';
import Hero from './pages/Hero';
import { LoadingOutlined } from '@ant-design/icons';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const accessToken =localStorage.getItem('access_token') || '';
  const isIntroDone = localStorage.getItem('isIntroDone') === 'true';
  useEffect(() => {
    const checkAuth = async () => {
      if (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/callback') {
        setIsChecking(false);
        return;
      }

      if (!accessToken) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        await GetUserInfo(accessToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Token 验证或获取用户信息失败', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('userInfo');
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [accessToken]);

  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <LoadingOutlined className='text-lg lg:text-2xl 2xl:text-4xl' style={{color: '#219ebc'}}/>
      </div>
    );
  }

  return (
      <>
      <Routes>
        <Route path="/" element={<Hero skipIntro={isIntroDone}/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        {isAuthenticated ? (
          <>
            <Route path="/chat/*" element={<Chat accessToken={accessToken} />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </>
  );
}

export default App;
