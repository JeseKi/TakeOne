import { Alert, List } from '@lobehub/ui';
import { useEffect, useState } from 'react';

import { GetSessionsID } from '../../Api';
import { useNavigate } from 'react-router-dom';

interface SessionsListProps {
    accessToken: string;
}

interface SessionItem {
    title: string;
    description: string;
}

export default function SessionsList(props: SessionsListProps) {
    const { accessToken } = props;
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [sessionsId, setSessionsId] = useState<string[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const navigate = useNavigate(); 

    useEffect(() => {
        GetSessionsID(accessToken).then((result) => {
            setSessionsId(result);
            setLoading(false);
        }).catch((error) => {
            console.error('获取对话列表失败:', error);
            setShowAlert(true);
        });
    }, [accessToken, setSessionsId]);

    const handleSessionClick = (sessionId: string) => {
        navigate(`/chat?session=${sessionId}`);
    }

    if (loading) {
        return (
            <div>正在获取对话列表...</div>
        )
    }

    if (!sessionsId) {
        return (<div>这里空荡荡的...</div>);
    }

    const sessionsList: SessionItem[] = sessionsId.map((sessionId: string, index: number): SessionItem => {
        return {
        title: `第 ${index + 1} 轮对话`,
        description: sessionId,
        };
    });

    return(
        <>
            {showAlert && (
                <Alert
                    type='error'
                    message={"获取对话列表失败"}
                    closable
                    onClose={() => setShowAlert(false)}
                />
            )}
            {sessionsList.map((item, index) => (
                    <List.Item key={index} {...item} id='session_item' onClick={() => handleSessionClick(item.description)}/>
            ))}
        </>
    );
}