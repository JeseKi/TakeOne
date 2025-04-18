import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Card, Modal, Divider, Tag, Collapse } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import styles from './ChatPage.module.css';

import { ChoiceResponse, RoundResponse } from '../../Api';

interface RoundCardProps {
  round: RoundResponse;
  roundIsActive: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (selectedChoice: ChoiceResponse, otherChoice: ChoiceResponse) => Promise<void>;
  isLoading?: boolean;
  isSessionFinished?: boolean;
}

const RoundCard: React.FC<RoundCardProps> = ({
  round,
  roundIsActive: isActive,
  latestChoices,
  onSelectChoice,
  isLoading: externalLoading = false,
  isSessionFinished = false
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const [expandedChoiceIndex, setExpandedChoiceIndex] = useState<number | null>(null);
  const [hoveredChoiceIndex, setHoveredChoiceIndex] = useState<number | null>(null);

  const isLoading = internalLoading || externalLoading;

  const [localAdvancedMajors, setLocalAdvancedMajors] = useState<string[]>([]);
  const [localEliminatedMajors, setLocalEliminatedMajors] = useState<string[]>([]);
  const [localPendingMajors, setLocalPendingMajors] = useState<string[]>([]);

  const roundMemo = useMemo(() => ({
    appearances: round.appearances,
    current_round_majors: round.current_round_majors,
    round_number: round.round_number,
    status: round.status
  }), [
    JSON.stringify(round.appearances),
    JSON.stringify(round.current_round_majors),
    round.round_number,
    round.status
  ]);

  useEffect(() => {
    const newAdvancedMajors = roundMemo.appearances.filter(a => a.is_winner_in_comparison === true).map(a => a.major_name);
    const newEliminatedMajors = roundMemo.appearances.filter(a => a.is_winner_in_comparison === false).map(a => a.major_name);
    const newPendingMajors = roundMemo.current_round_majors.filter(major =>
      !roundMemo.appearances.some(a => a.major_name === major && a.is_winner_in_comparison !== null)
    );

    setLocalAdvancedMajors(newAdvancedMajors);
    setLocalEliminatedMajors(newEliminatedMajors);
    setLocalPendingMajors(newPendingMajors);
  }, [roundMemo]);

  const getUnselectedChoicesInActiveRound = useCallback(() => {
    if (!isActive) return null;
    const unselectedAppearances = roundMemo.appearances.filter(a => a.is_winner_in_comparison === null);
    if (unselectedAppearances.length === 2) {
      return [
        unselectedAppearances[0] as ChoiceResponse,
        unselectedAppearances[1] as ChoiceResponse
      ];
    }
    return null;
  }, [isActive, roundMemo]);

  const currentChoices = getUnselectedChoicesInActiveRound() || latestChoices;

  useEffect(() => {
    if (!isActive || !currentChoices) {
      setExpandedChoiceIndex(null);
    }
  }, [isActive, currentChoices]);

  useEffect(() => {
    if (!externalLoading && internalLoading) {
      setInternalLoading(false);
    }
    if (externalLoading === false && errorState) {
      setErrorState(false);
    }
    setInternalLoading(false);
    setErrorState(false);
  }, [externalLoading, currentChoices]);

  const handleToggleDrawer = (index: number) => {
    if (isLoading || isSessionFinished) return;
    if (currentChoices && currentChoices[index]?.is_winner_in_comparison !== null) {
      return;
    }
    setExpandedChoiceIndex(prevIndex => (prevIndex === index ? null : index));
  };

  const handleConfirmChoice = async (isFirstOption: boolean) => {
    if (!currentChoices) {
      console.error('错误：没有可选择的选项');
      return;
    }

    setInternalLoading(true);
    setErrorState(false);
    setExpandedChoiceIndex(null);
    setHoveredChoiceIndex(null);
    const selectedChoice = isFirstOption ? currentChoices[0] : currentChoices[1];
    const otherChoice = isFirstOption ? currentChoices[1] : currentChoices[0];

    try {
      await onSelectChoice(selectedChoice, otherChoice);
      setExpandedChoiceIndex(null);
      const updatedAdvancedMajors = [...localAdvancedMajors];
      const updatedEliminatedMajors = [...localEliminatedMajors];
      if (!updatedAdvancedMajors.includes(selectedChoice.major_name)) {
        updatedAdvancedMajors.push(selectedChoice.major_name);
      }
      if (!updatedEliminatedMajors.includes(otherChoice.major_name)) {
        updatedEliminatedMajors.push(otherChoice.major_name);
      }
      const newPendingMajors = roundMemo.current_round_majors.filter(major =>
        !updatedAdvancedMajors.includes(major) && !updatedEliminatedMajors.includes(major)
      );
      setLocalAdvancedMajors(updatedAdvancedMajors);
      setLocalEliminatedMajors(updatedEliminatedMajors);
      setLocalPendingMajors(newPendingMajors);
    } catch (error) {
      console.error('错误确认选择：', error);
      setErrorState(true);
    } finally {
      setInternalLoading(false);
      setExpandedChoiceIndex(null);
      setHoveredChoiceIndex(null);
    }
  };

  return (
    <div className={`mb-8 relative transition-all duration-300 
      ${!isActive ? 'after:content-[""] after:absolute after:inset-0 after:bg-white/70 after:z-10 after:rounded-lg after:pointer-events-none' : ''}
      ${isActive && !isSessionFinished && !isLoading ? 'mb-30 lg:mb-100' : ''}`}>
      {(expandedChoiceIndex !== null || hoveredChoiceIndex !== null) && (
        <div
          className={styles.overlay}
          onClick={() => {
            setExpandedChoiceIndex(null);
            setHoveredChoiceIndex(null);
          }}
        />
      )}
      <Card
        className="rounded-lg shadow-md overflow-visible"
        title={`第 ${round.round_number} 轮`}
        extra={
          <Button
            type="text"
            icon={<InfoCircleOutlined/>}
            className={styles.skPushButton}
            onClick={() => setInfoModalVisible(true)}
          />
        }
      >
        {isActive && currentChoices && !isSessionFinished && (
          <div className="flex justify-between items-start py-4">
            {currentChoices.map((choice, index) => (
              <ChoiceItem
                key={index}
                choice={choice}
                index={index}
                expandedChoiceIndex={expandedChoiceIndex}
                hoveredChoiceIndex={hoveredChoiceIndex}
                setHoveredChoiceIndex={setHoveredChoiceIndex}
                handleToggleDrawer={handleToggleDrawer}
                handleConfirmChoice={handleConfirmChoice}
                internalLoading={internalLoading}
                isLoading={isLoading}
                isSessionFinished={isSessionFinished}
                errorState={errorState}
              />
            ))}
          </div>
        )}
        {(!isActive || !currentChoices || isSessionFinished) && roundMemo.appearances.length > 0 && (
          <Collapse defaultActiveKey={[]} ghost>
            <Collapse.Panel header={`查看第 ${round.round_number} 轮结果（共 ${roundMemo.appearances.length} 项）`} key='results'>
              <div className='flex flex-col gap-3 py-2'>
                {roundMemo.appearances.map((appearance, index) => (
                  <div key={index} className={`w-full p-3 rounded-lg border transition-all duration-300
                    ${appearance.is_winner_in_comparison === true ? 'bg-green-50 border-green-500' :
                      appearance.is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 opacity-80' :
                      'bg-white border-gray-300'}`}>
                    <div className='font-semibold text-base mb-1 flex items-center'>
                      {appearance.is_winner_in_comparison === true && <CheckCircleOutlined className='mr-2 text-green-500' />}
                      {appearance.is_winner_in_comparison === false && <StopOutlined className='mr-2 text-red-500' />}
                      {appearance.major_name}
                    </div>
                    <p className='text-sm text-gray-600 m-0 leading-normal'>{appearance.description || '暂无描述'}</p>
                  </div>
                ))}
              </div>
            </Collapse.Panel>
          </Collapse>
        )}
      </Card>
      <Modal
        title={`第 ${round.round_number} 轮详细信息`}
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={700}
      >
        {localAdvancedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">晋级专业</h3>
            <div className="flex flex-wrap gap-2">
              {localAdvancedMajors.map((major, index) => (
                <Tag key={index} color="success">
                  <CheckCircleOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {localEliminatedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">淘汰专业</h3>
            <div className="flex flex-wrap gap-2">
              {localEliminatedMajors.map((major, index) => (
                <Tag key={index} color="error">
                  <StopOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {localPendingMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">待选择专业</h3>
            <div className="flex flex-wrap gap-2">
              {localPendingMajors.map((major, index) => (
                <Tag key={index} color="processing">
                  {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        <Divider />
        <div className="mb-5">
          <h3 className="mb-2 text-base">所有专业列表</h3>
          <div className="flex flex-wrap gap-2">
            {roundMemo.current_round_majors.map((major, index) => (
              <Tag key={index} color={
                localAdvancedMajors.includes(major) ? 'success' :
                localEliminatedMajors.includes(major) ? 'error' :
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

function ChoiceItem(props: {
  choice: ChoiceResponse;
  index: number;
  expandedChoiceIndex: number | null;
  hoveredChoiceIndex: number | null;
  setHoveredChoiceIndex: (idx: number | null) => void;
  handleToggleDrawer: (idx: number) => void;
  handleConfirmChoice: (isFirstOption: boolean) => void;
  internalLoading: boolean;
  isLoading: boolean;
  isSessionFinished: boolean;
  errorState: boolean;
}) {
  const {
    choice,
    index,
    expandedChoiceIndex,
    hoveredChoiceIndex,
    setHoveredChoiceIndex,
    handleToggleDrawer,
    handleConfirmChoice,
    internalLoading,
    isLoading,
    isSessionFinished,
    errorState,
  } = props;
  const isExpanded = expandedChoiceIndex === index;
  const isInteractive = choice.is_winner_in_comparison === null && !isLoading && !isSessionFinished;
  const buttonBaseClasses = `w-full min-h-[80px] text-center flex flex-col justify-center items-center relative transition-all duration-300 rounded-lg border`;
  let dynamicClasses = '';
  if (choice.is_winner_in_comparison === true) {
    dynamicClasses = 'bg-green-50 border-green-500 shadow-md shadow-green-100 transform -translate-y-1';
  } else if (choice.is_winner_in_comparison === false) {
    dynamicClasses = 'bg-gray-100 border-gray-300 text-gray-500 opacity-70';
  } else if (errorState && isExpanded) {
    dynamicClasses = 'bg-red-50 border-red-300';
  } else if (isExpanded) {
    dynamicClasses = 'bg-[#219ebc] border-[#219ebc] text-white shadow-md transform -translate-y-1';
  } else if (hoveredChoiceIndex === index) {
    dynamicClasses = 'bg-[#8ecae6] border-[#219ebc] text-white shadow-md transform -translate-y-1 cursor-pointer';
  } else {
    dynamicClasses = `bg-[#8ecae6] border-[#219ebc] ${isInteractive ? 'hover:bg-[#219ebc] hover:border-[#219ebc] hover:shadow-md hover:-translate-y-1 hover:text-white cursor-pointer' : 'cursor-not-allowed opacity-80'}`;
  }
  const buttonClasses = `${buttonBaseClasses} ${dynamicClasses}`;
  return (
    <div
      className={`w-[45%] relative ${isExpanded || hoveredChoiceIndex === index ? 'z-40' : 'z-10'}`}
      onMouseEnter={() => isInteractive && setHoveredChoiceIndex(index)}
      onMouseLeave={() => setHoveredChoiceIndex(null)}
      onClick={(e) => {
        if (isExpanded && e.currentTarget === e.target) {
          handleToggleDrawer(index);
        }
      }}
    >
      <Button
        className={`${buttonClasses} ${styles.skPushButton}`}
        disabled={!isInteractive || (expandedChoiceIndex !== null && !isExpanded)}
        onClick={() => handleToggleDrawer(index)}
      >
        <div className="p-2 flex flex-col items-center justify-center h-full">
          <h3 className="m-0 p-0 text-lg font-semibold mb-1">{choice.major_name}</h3>
          {choice.is_winner_in_comparison === true && <CheckCircleOutlined className="text-green-500 text-xl" />}
          {choice.is_winner_in_comparison === false && <StopOutlined className="text-red-500 text-xl" />}
        </div>
      </Button>
      <div className={`${styles.choiceDrawerContainer} ${(isExpanded || hoveredChoiceIndex === index) ? styles.choiceDrawerContainerActive : ''}`}>
        <div className={`${styles.choiceDrawerInner} text-left ${(isExpanded || hoveredChoiceIndex === index) ? styles.choiceDrawerInnerActive : ''}`}>
          <p className="text-[10px] sm:text-lg xl:text-xl text-gray-700 mb-3">{choice.description || "暂无详细描述。"}</p>
          {errorState && isExpanded && (
            <p className="text-[10px] sm:text-xs xl:text-sm text-red-600 mb-2">选择失败，请重试。</p>
          )}
          <Button
            onClick={() => handleConfirmChoice(index === 0)}
            loading={internalLoading && isExpanded}
            disabled={internalLoading}
            className={`w-full ${styles.skPushButton}`}
          >
            <span className='text-[10px] sm:text-sm xl:text-lg'><CheckCircleOutlined /> 确定选择 {choice.major_name}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RoundCard;