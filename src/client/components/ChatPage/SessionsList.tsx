import { Alert, Empty, Spin, Card } from 'antd';
import { useEffect, useState } from 'react';
import { MessageOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { Typography, Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';

import { GetSessionsID } from '../../Api';

const { Title, Text } = Typography;

interface SessionsListProps {
    accessToken: string;
    setSessionId: (sessionId: string | null) => void;
}

interface SessionItem {
    title: string;
    description: string;
}

export default function SessionsList(props: SessionsListProps) {
    const { accessToken, setSessionId } = props;
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [sessionsId, setSessionsId] = useState<string[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string>('获取对话列表失败');

    const navigate = useNavigate(); 

    useEffect(() => {
        GetSessionsID(accessToken).then((result) => {
            setSessionsId(result);
            setLoading(false);
        }).catch((error) => {
            console.error('获取对话列表失败:', error);
            setErrorMessage('获取对话列表失败: ' + error.message);
            setShowAlert(true);
            setLoading(false);
        });
    }, [accessToken, setSessionsId]);

    const handleSessionClick = (sessionId: string) => {
        navigate(`/chat?session=${sessionId}`);
    }

    const handleCreateNewSession = () => {
        navigate('/chat');
        setSessionId(null);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[200px] p-5">
                <Spin size="large" />
                <Text className="my-3 text-gray-600">正在获取对话列表...</Text>
                <Skeleton active paragraph={{ rows: 3 }} />
            </div>
        )
    }

    const sessionsList: SessionItem[] = sessionsId ? sessionsId.map((sessionId: string, index: number): SessionItem => {
        return {
            title: `第 ${index + 1} 次对话`,
            description: sessionId,
        };
    }) : [];

    return(
        <div className="p-2 w-full">
            <div 
                className="flex items-center justify-start w-[calc(100%-16px)] m-2 p-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={handleCreateNewSession}
            >
                <PlusOutlined className="text-base mr-2.5" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">新建对话</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 p-2 px-2.5">
                <Title level={5} className="m-0"><HistoryOutlined /> 对话历史</Title>
            </div>
            
            {showAlert && (
                <Alert
                    type='error'
                    message={errorMessage}
                    closable
                    onClose={() => setShowAlert(false)}
                    className="m-2.5 rounded-md"
                />
            )}
            
            {!sessionsId || sessionsId.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] p-5">
                    <Empty
                        description={
                            <span>还没有任何对话记录</span>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </div>
            ) : (
                <div className="mt-2.5">
                    {sessionsList.map((item, index) => (
                        <Card
                            key={index}
                            hoverable
                            className="border-none rounded-md mb-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-none"
                            onClick={() => handleSessionClick(item.description)}
                        >
                            <div className="flex items-center p-2 px-2.5">
                                <MessageOutlined className="text-base text-gray-500 mr-2.5" />
                                <div className="flex flex-col overflow-hidden">
                                    <Text strong className="text-sm mb-0 whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">{item.title}</Text>
                                    <Text type="secondary" className="text-xs mb-0 text-gray-500">{item.description.substring(0, 8)}...</Text>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}