import { SessionsList } from './SessionsList';

import "./Chat.css"
import BaseInformation from '../BaseInfomation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ChatsNavProps {
    accessToken: string;
}

export const Chat: React.FC<ChatsNavProps> = (props) => {
    const { accessToken } = props;
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (location.pathname === '/chat') {
            searchParams.get('session') && setSessionId(searchParams.get('session'));
        }
    }, [searchParams]);

    return (
        <div>
            <div id='chats-nav'>
                <SessionsList accessToken={accessToken} />
            </div>
            { !sessionId &&
                <BaseInformation accessToken={accessToken} />
            }
        </div>
    )
}