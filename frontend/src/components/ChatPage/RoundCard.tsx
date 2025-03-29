import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Divider, Tag } from 'antd';
import { InfoCircleOutlined, TrophyOutlined, StopOutlined, LoadingOutlined } from '@ant-design/icons';

import {
  RoundResponse,
  ChoiceResponse,
  MajorChoice
} from '../../Api';

import './RoundCard.css';

interface RoundCardProps {
  round: RoundResponse;
  isLatest: boolean;
  isActive: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (choice1: MajorChoice, choice2: MajorChoice) => void;
  isLoading?: boolean;
}

const RoundCard: React.FC<RoundCardProps> = ({ 
  round, 
  isLatest, 
  isActive, 
  latestChoices, 
  onSelectChoice,
  isLoading: externalLoading = false
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [choice1Hover, setChoice1Hover] = useState(false);
  const [choice2Hover, setChoice2Hover] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  
  const isLoading = internalLoading || externalLoading;
  
  const advancedMajors = round.appearances.filter(a => a.is_winner_in_comparison === true).map(a => a.major_name);
  const eliminatedMajors = round.appearances.filter(a => a.is_winner_in_comparison === false).map(a => a.major_name);
  const pendingMajors = round.current_round_majors.filter(major => 
    !round.appearances.some(a => a.major_name === major && a.is_winner_in_comparison !== null)
  );
  
  const getUnselectedChoicesInActiveRound = () => {
    if (!isActive) return null;
    
    const unselectedAppearances = round.appearances.filter(a => a.is_winner_in_comparison === null);
    
    if (unselectedAppearances.length === 2) {
      return [
        unselectedAppearances[0],
        unselectedAppearances[1]
      ];
    }
    
    return null;
  };
  
  const currentChoices = getUnselectedChoicesInActiveRound() || latestChoices;

  useEffect(() => {
    setInternalLoading(false);
  },[currentChoices]);

  return (
    <div className={`round-card ${isLatest ? 'latest-round' : 'past-round'} ${!isActive ? 'inactive-round' : ''}`}>
      <Card
        className="round-card-header"
        title={`第 ${round.round_number} 轮`}
        extra={
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            onClick={() => setInfoModalVisible(true)}
          />
        }
      >
        {isActive && currentChoices && (
          <div className="choice-container">
            <div className="choice-left">
              <Button
                className={`choice-button left-choice ${
                  currentChoices[0].is_winner_in_comparison === true ? 'advanced' : 
                  currentChoices[0].is_winner_in_comparison === false ? 'eliminated' : ''
                }`}
                disabled={currentChoices[0].is_winner_in_comparison !== null || isLoading}
                onClick={() => {
                  setInternalLoading(true);
                  onSelectChoice(
                    { major_id: currentChoices[0].major_id, is_winner_in_comparison: true },
                    { major_id: currentChoices[1].major_id, is_winner_in_comparison: false }
                  );
                }}
                onMouseEnter={() => setChoice1Hover(true)}
                onMouseLeave={() => setChoice1Hover(false)}
              >
                <div className="choice-content">
                  <h3>{currentChoices[0].major_name}</h3>
                  {currentChoices[0].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[0].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                  {isLoading && <LoadingOutlined />}
                </div>
                {choice1Hover && (
                  <div className="description-tooltip">
                    {currentChoices[0].description || "暂无描述"}
                  </div>
                )}
              </Button>
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className="choice-right">
              <Button
                className={`choice-button right-choice ${
                  currentChoices[1].is_winner_in_comparison === true ? 'advanced' : 
                  currentChoices[1].is_winner_in_comparison === false ? 'eliminated' : ''
                }`}
                disabled={currentChoices[1].is_winner_in_comparison !== null || isLoading}
                onClick={() => {
                  setInternalLoading(true);
                  onSelectChoice(
                    { major_id: currentChoices[0].major_id, is_winner_in_comparison: false },
                    { major_id: currentChoices[1].major_id, is_winner_in_comparison: true }
                  );
                }}
                onMouseEnter={() => setChoice2Hover(true)}
                onMouseLeave={() => setChoice2Hover(false)}
              >
                <div className="choice-content">
                  <h3>{currentChoices[1].major_name}</h3>
                  {currentChoices[1].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[1].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                  {isLoading && <LoadingOutlined />}
                </div>
                {choice2Hover && (
                  <div className="description-tooltip">
                    {currentChoices[1].description || "暂无描述"}
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {(!isActive || !currentChoices) && round.appearances.length > 0 && (
          <div className="round-results">
            {round.appearances.map((appearance, index) => (
              <div key={index} className={`appearance-item ${
                appearance.is_winner_in_comparison === true ? 'winner' : 
                appearance.is_winner_in_comparison === false ? 'loser' : ''
              }`}>
                <div className="major-name">
                  {appearance.is_winner_in_comparison === true && (
                    <TrophyOutlined className="winner-icon" />
                  )}
                  {appearance.is_winner_in_comparison === false && (
                    <StopOutlined className="loser-icon" />
                  )}
                  {appearance.major_name}
                </div>
                <p className="major-description">{appearance.description || "暂无描述"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Modal
        title={`第 ${round.round_number} 轮详细信息`}
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={700}
      >
        {advancedMajors.length > 0 && (
          <div className="info-section">
            <h3>晋级专业</h3>
            <div className="majors-list">
              {advancedMajors.map((major, index) => (
                <Tag key={index} color="success">
                  <TrophyOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {eliminatedMajors.length > 0 && (
          <div className="info-section">
            <h3>淘汰专业</h3>
            <div className="majors-list">
              {eliminatedMajors.map((major, index) => (
                <Tag key={index} color="error">
                  <StopOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {pendingMajors.length > 0 && (
          <div className="info-section">
            <h3>待选择专业</h3>
            <div className="majors-list">
              {pendingMajors.map((major, index) => (
                <Tag key={index} color="processing">
                  {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        <Divider />
        
        <div className="info-section">
          <h3>所有专业</h3>
          <div className="majors-list">
            {round.current_round_majors.map((major, index) => (
              <Tag key={index} color={
                advancedMajors.includes(major) ? 'success' : 
                eliminatedMajors.includes(major) ? 'error' : 
                'default'
              }>
                {major}
              </Tag>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoundCard;
