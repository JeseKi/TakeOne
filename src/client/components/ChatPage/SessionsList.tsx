import { MessageOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { Typography, Skeleton, Button, Empty, Card, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './ChatPage.module.css';

interface SessionsListProps {
    sessionsId: string[] | null;
    loading: boolean;
    errorMessage?: string | null;
    setSessionId: (sessionId: string | null) => void;
}

interface SessionItem {
    title: string;
    description: string;
}

export default function SessionsList(props: SessionsListProps) {
    const { sessionsId, loading, errorMessage, setSessionId } = props;
    const navigate = useNavigate();

    const handleSessionClick = (sessionId: string) => {
        navigate(`/chat?session=${sessionId}`);
        setSessionId(sessionId);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[200px] p-5">
                <Skeleton active paragraph={{ rows: 3 }} />
            </div>
        );
    }

    const sessionsList: SessionItem[] = sessionsId ? sessionsId.map((sessionId: string, index: number): SessionItem => {
        return {
            title: `第 ${index + 1} 次会话`,
            description: sessionId,
        };
    }) : [];

    return (
        <div className="p-2">
            <Button
                className={`w-full m-2 ${styles.skPushButton}`}
                onClick={() => setSessionId(null)}
            >
                <PlusOutlined className="text-base mr-2.5" />
                新建会话
            </Button>

            <div className="flex justify-between items-center mb-4 p-2 px-2.5">
                <Typography.Title level={5} className="m-0"><HistoryOutlined /> 会话历史</Typography.Title>
            </div>

            {errorMessage && (
                <Alert
                    type='error'
                    message={errorMessage}
                    showIcon
                    className="m-2.5 rounded-md"
                />
            )}

            {!sessionsList.length ? (
                <div className="flex flex-col items-center justify-center h-[200px] p-5">
                    <Empty
                        description={
                            <span>还没有任何会话记录</span>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </div>
            ) : (
                <div>
                    {sessionsList.map((item, index) => (
                        <Card
                            key={index}
                            hoverable
                            onClick={() => handleSessionClick(item.description)}
                            className={styles.skPushButton}
                        >
                            <div className="flex items-center">
                                <MessageOutlined className="text-base text-gray-500 mr-2.5" />
                                <div className={`flex flex-col overflow-hidden`}>
                                    <strong className="text-sm mb-0 whitespace-nowrap overflow-hidden text-ellipsis text-gray-700">{item.title}</strong>
                                    <p className="text-xs mb-0 text-gray-500">{item.description.substring(0, 8)}...</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}