import React, { useEffect, useState } from 'react';
import { Card, Spin, Modal } from 'antd';
import { GradientButton } from '@lobehub/ui';

import {
  GetSessionContent,
  SessionContentResponse,
  GetChoices,
  PostChoices,
  GetRound,
  GetReport,
  GenerateType,
  ChoiceResponse,
  RoundResponse,
  MajorChoice,
  MajorChoiceRequest
} from '../../Api';
import BaseInformationPanel from '../BaseInfomation';
import RoundList from './RoundList';

import './SessionContent.css';

interface SessionContentProps {
  accessToken: string;
  session_id: string;
}

const SessionContent: React.FC<SessionContentProps> = (props) => {
  const { session_id, accessToken } = props;
  const [sessionContent, setSessionContent] = useState<SessionContentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [rounds, setRounds] = useState<RoundResponse[]>([]);
  const [latestChoices, setLatestChoices] = useState<[ChoiceResponse, ChoiceResponse] | null>(null);
  const [loadingChoices, setLoadingChoices] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    GetSessionContent(session_id, accessToken).then((response) => {
      setSessionContent(response);
      if (response.rounds) {
        setRounds(response.rounds);
        setActiveRoundIndex(response.rounds.length - 1);
      }
      setLoading(false);
      if (!response.rounds || response.rounds.length === 0) {
        handleGetRound();
      } else {
        const lastRound = response.rounds[response.rounds.length - 1];
        if (lastRound.status === 'ACTIVE') {
          handleGetChoices();
        }
      }
    }).catch((error) => {
      console.error('获取对话内容失败', error);
      setLoading(false);
    });
  }, [session_id]);

  const handleBaseInfoCommit = async () => {
    try {
      const emptyChoiceRequest: MajorChoiceRequest = {
        choices: null
      };
      
      setLoadingChoices(true);
      const response = await PostChoices(session_id, emptyChoiceRequest, accessToken);
      
      if (response.generate_type === GenerateType.ROUND) {
        await handleGetRound();
      }
      
      setLoadingChoices(false);
      setShowModal(false);
    } catch (error) {
      console.error('提交基础信息后创建第一轮失败', error);
      setLoadingChoices(false);
    }
  }

  const handleGetRound = async () => {
    try {
      setLoadingChoices(true);
      const roundData = await GetRound(session_id, accessToken);
      setLatestChoices(roundData.choices);
      
      const newRound: RoundResponse = {
        round_number: roundData.current_round_number,
        status: 'ACTIVE',
        current_round_majors: roundData.current_round_majors,
        appearances: []
      };
      
      setRounds(prev => {
        const newRounds = [...prev, newRound];
        setActiveRoundIndex(newRounds.length - 1);
        return newRounds;
      });
      
      setLoadingChoices(false);
    } catch (error) {
      console.error('获取新一轮失败', error);
      setLoadingChoices(false);
    }
  };

  const handleGetChoices = async () => {
    try {
      setLoadingChoices(true);
      const choicesResponse = await GetChoices(session_id, accessToken);
      
      setLatestChoices(choicesResponse.choices);
      
      setRounds(prev => {
        const newRounds = [...prev];
        if (newRounds.length > 0) {
          const lastRound = newRounds[newRounds.length - 1];
          
          const existingChoice1 = lastRound.appearances.find(a => a.major_id === choicesResponse.choices[0].major_id);
          const existingChoice2 = lastRound.appearances.find(a => a.major_id === choicesResponse.choices[1].major_id);
          
          if (!existingChoice1 && !existingChoice2) {
            lastRound.appearances = [...lastRound.appearances, choicesResponse.choices[0], choicesResponse.choices[1]];
          }
        }
        return newRounds;
      });
      
      setLoadingChoices(false);
    } catch (error) {
      console.error('获取选项失败', error);
      setLoadingChoices(false);
    }
  };

  const handleSelectChoice = async (choice1: MajorChoice, choice2: MajorChoice) => {
    try {
      setLoadingChoices(true);
      const request: MajorChoiceRequest = {
        choices: [choice1, choice2]
      };
      
      const response = await PostChoices(session_id, request, accessToken);
      
      if (latestChoices) {
        const updatedChoices: [ChoiceResponse, ChoiceResponse] = [
          { ...latestChoices[0], is_winner_in_comparison: choice1.is_winner_in_comparison },
          { ...latestChoices[1], is_winner_in_comparison: choice2.is_winner_in_comparison }
        ];
        
        setRounds(prev => {
          const newRounds = [...prev];
          const lastRound = newRounds[newRounds.length - 1];
          
          const filteredAppearances = lastRound.appearances.filter(
            a => a.major_id !== updatedChoices[0].major_id && a.major_id !== updatedChoices[1].major_id
          );
          
          lastRound.appearances = [...filteredAppearances, updatedChoices[0], updatedChoices[1]];
          return newRounds;
        });
        
        // 清空当前选项，避免重复选择
        setLatestChoices(null);
      }
      
      if (response.generate_type === GenerateType.CHOICES) {
        // 立即获取新选项
        await handleGetChoices();
      } else if (response.generate_type === GenerateType.ROUND) {
        // 当前轮次完成，创建新轮次前将当前轮次标记为非活跃
        setActiveRoundIndex(undefined);
        await handleGetRound();
      } else if (response.generate_type === GenerateType.REPORT) {
        const reportData = await GetReport(session_id, accessToken);
        setReport(reportData.report);
      }
      
      setLoadingChoices(false);
    } catch (error) {
      console.error('提交选择失败', error);
      setLoadingChoices(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><Spin size="large" tip="加载中..." /></div>;
  }

  return (
    <div className="session-content">
      <div className="session-header">
        <GradientButton id='base_info_modal_button' onClick={() => setShowModal(true)}>查看基本信息</GradientButton>
        {report && (
          <div className="final-report">
            <h2>最终结果</h2>
            <Card className="report-card">
              <div dangerouslySetInnerHTML={{ __html: report }} />
            </Card>
          </div>
        )}
      </div>
      
      <Modal 
        title={"基本信息（无法编辑）"} 
        open={showModal} 
        onCancel={() => setShowModal(false)} 
        onOk={() => setShowModal(false)} 
        okText={"已阅"} 
        cancelButtonProps={{disabled: true}}
      >
        {sessionContent && (
          <BaseInformationPanel 
            accessToken={accessToken} 
            base_information={sessionContent.base_information} 
            submit_event={handleBaseInfoCommit}
          />
        )}
      </Modal>
      
      <RoundList
        rounds={rounds}
        loadingChoices={loadingChoices}
        latestChoices={latestChoices}
        onSelectChoice={handleSelectChoice}
        activeRoundIndex={activeRoundIndex}
      />
    </div>
  );
};

export default SessionContent;