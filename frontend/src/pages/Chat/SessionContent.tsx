import React, { useEffect, useState } from 'react';
import { Card, Button, Spin, Badge, Modal } from 'antd';
import { InfoCircleOutlined, TrophyOutlined, StopOutlined } from '@ant-design/icons';
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

import './SessionContent.css';

interface SessionContentProps {
  accessToken: string;
  session_id: string;
}

interface RoundCardProps {
  round: RoundResponse;
  isLatest: boolean;
  onSelectChoice: (choice1: MajorChoice, choice2: MajorChoice) => void;
  latestChoices?: [ChoiceResponse, ChoiceResponse];
}

const RoundCard: React.FC<RoundCardProps> = ({ round, isLatest, onSelectChoice, latestChoices }) => {
  const [showRoundInfo, setShowRoundInfo] = useState(false);

  const advancedMajors = round.appearances.filter(a => a.is_winner_in_comparison === true).map(a => a.major_name);
  const eliminatedMajors = round.appearances.filter(a => a.is_winner_in_comparison === false).map(a => a.major_name);
  const pendingMajors = round.current_round_majors.filter(major => 
    !round.appearances.some(a => a.major_name === major && a.is_winner_in_comparison !== null)
  );

  return (
    <div className={`round-card ${isLatest ? 'latest-round' : 'past-round'}`}>
      <Card
        className="round-card-header"
        extra={
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            onClick={() => setShowRoundInfo(true)} 
          />
        }
        title={`第 ${round.round_number} 轮`}
      >
        <div className="round-choices">
          {isLatest && latestChoices ? (
            <div className="choice-container">
              <Button
                className="choice-button left-choice"
                onClick={() => onSelectChoice(
                  { major_id: latestChoices[0].major_id, is_winner_in_comparison: true },
                  { major_id: latestChoices[1].major_id, is_winner_in_comparison: false }
                )}
              >
                <div className="choice-content">
                  <h3>{latestChoices[0].major_name}</h3>
                  <p>{latestChoices[0].description}</p>
                </div>
              </Button>
              
              <div className="vs-divider">VS</div>
              
              <Button
                className="choice-button right-choice"
                onClick={() => onSelectChoice(
                  { major_id: latestChoices[0].major_id, is_winner_in_comparison: false },
                  { major_id: latestChoices[1].major_id, is_winner_in_comparison: true }
                )}
              >
                <div className="choice-content">
                  <h3>{latestChoices[1].major_name}</h3>
                  <p>{latestChoices[1].description}</p>
                </div>
              </Button>
            </div>
          ) : (
            <div className="round-results">
              {round.appearances.map((appearance) => (
                <div 
                  key={appearance.major_id}
                  className={`appearance-item ${appearance.is_winner_in_comparison ? 'winner' : appearance.is_winner_in_comparison === false ? 'loser' : ''}`}
                >
                  <div className="major-name">
                    {appearance.is_winner_in_comparison && <TrophyOutlined className="winner-icon" />}
                    {appearance.is_winner_in_comparison === false && <StopOutlined className="loser-icon" />}
                    <span>{appearance.major_name}</span>
                  </div>
                  <p className="major-description">{appearance.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      
      <Modal
        title={`第 ${round.round_number} 轮详情`}
        open={showRoundInfo}
        onCancel={() => setShowRoundInfo(false)}
        onOk={() => setShowRoundInfo(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={700}
      >
        <div className="round-info-modal">
          <div className="info-section">
            <h3>本轮参与专业 ({round.current_round_majors.length})</h3>
            <div className="majors-list">
              {round.current_round_majors.map(major => (
                <Badge key={major} className="major-badge" count={major} style={{ backgroundColor: '#108ee9' }} />
              ))}
            </div>
          </div>
          
          {advancedMajors.length > 0 && (
            <div className="info-section">
              <h3>晋级专业 ({advancedMajors.length})</h3>
              <div className="majors-list">
                {advancedMajors.map(major => (
                  <Badge key={major} className="major-badge winner-badge" count={major} style={{ backgroundColor: '#52c41a' }} />
                ))}
              </div>
            </div>
          )}
          
          {eliminatedMajors.length > 0 && (
            <div className="info-section">
              <h3>淘汰专业 ({eliminatedMajors.length})</h3>
              <div className="majors-list">
                {eliminatedMajors.map(major => (
                  <Badge key={major} className="major-badge loser-badge" count={major} style={{ backgroundColor: '#f5222d' }} />
                ))}
              </div>
            </div>
          )}
          
          {pendingMajors.length > 0 && (
            <div className="info-section">
              <h3>待选专业 ({pendingMajors.length})</h3>
              <div className="majors-list">
                {pendingMajors.map(major => (
                  <Badge key={major} className="major-badge pending-badge" count={major} style={{ backgroundColor: '#faad14' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

const SessionContent: React.FC<SessionContentProps> = (props) => {
  const { session_id, accessToken } = props;
  const [sessionContent, setSessionContent] = useState<SessionContentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [rounds, setRounds] = useState<RoundResponse[]>([]);
  const [latestChoices, setLatestChoices] = useState<[ChoiceResponse, ChoiceResponse] | null>(null);
  const [loadingChoices, setLoadingChoices] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    GetSessionContent(session_id, accessToken).then((response) => {
      setSessionContent(response);
      if (response.rounds) {
        setRounds(response.rounds);
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
      
      setRounds(prev => [...prev, newRound]);
      setLoadingChoices(false);
    } catch (error) {
      console.error('获取新一轮失败', error);
      setLoadingChoices(false);
    }
  };

  const handleGetChoices = async () => {
    try {
      setLoadingChoices(true);
      const choicesData = await GetChoices(session_id, accessToken);
      setLatestChoices(choicesData.choices);
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
        
        setLatestChoices(null);
      }
      
      if (response.generate_type === GenerateType.CHOICES) {
        await handleGetChoices();
      } else if (response.generate_type === GenerateType.ROUND) {
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
      
      <div id='line_break'></div>
      
      {/* 显示所有轮次 */}
      <div className="rounds-container">
        {rounds.map((round, index) => (
          <RoundCard
            key={index}
            round={round}
            isLatest={index === rounds.length - 1}
            onSelectChoice={handleSelectChoice}
            latestChoices={index === rounds.length - 1 ? latestChoices || undefined : undefined}
          />
        ))}
        
        {loadingChoices && (
          <div className="loading-choices">
            <Spin tip="加载中..." />
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionContent;