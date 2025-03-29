import { Alert, Empty, Spin, Card } from 'antd';
import { useEffect, useState } from 'react';
import { MessageOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { Typography, Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';

import { GetSessionsID } from '../../Api';
import './SessionsList.css';

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
            <div className="sessions-loading-container">
                <Spin size="large" />
                <Text className="loading-text">正在获取对话列表...</Text>
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
        <div className="sessions-list-container">
            <div className="new-chat-button" onClick={handleCreateNewSession}>
                <PlusOutlined className="new-chat-icon" />
                <span className="new-chat-text">新建对话</span>
            </div>
            
            <div className="sessions-header">
                <Title level={5}><HistoryOutlined /> 对话历史</Title>
            </div>
            
            {showAlert && (
                <Alert
                    type='error'
                    message={errorMessage}
                    closable
                    onClose={() => setShowAlert(false)}
                    className="sessions-alert"
                />
            )}
            
            {!sessionsId || sessionsId.length === 0 ? (
                <div className="sessions-empty-container">
                    <Empty
                        description={
                            <span>还没有任何对话记录</span>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </div>
            ) : (
                <div className="sessions-list">
                    {sessionsList.map((item, index) => (
                        <Card
                            key={index}
                            hoverable
                            className="session-card"
                            onClick={() => handleSessionClick(item.description)}
                        >
                            <div className="session-card-content">
                                <MessageOutlined className="session-icon" />
                                <div className="session-info">
                                    <Text strong className="session-title">{item.title}</Text>
                                    <Text type="secondary" className="session-id">{item.description.substring(0, 8)}...</Text>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}