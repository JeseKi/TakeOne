import { useState } from 'react';
import { TextArea, GradientButton , Alert } from '@lobehub/ui';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import { BaseInformation , MissingFieldsError, PostBaseInformation } from '../Api';
import { useNavigate } from 'react-router-dom';

interface BaseInformationProps {
  accessToken: string;
  base_information: BaseInformation | null;
  submit_event?: () => void;
}

const BaseInformationPanel: React.FC<BaseInformationProps> = (props: BaseInformationProps) => {
  const { accessToken , base_information, submit_event: onSubmit } = props;
  const navigate = useNavigate();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<BaseInformation>(() => {

  if (base_information !== null) {
      return { ...base_information };
    }
    return {
      max_living_expenses_from_parents: '',
      enough_savings_for_college: '',
      pocket_money_usage: '',
      willing_to_repeat_high_school_for_money: '',
      city_tier: '',
      parents_in_public_sector: '',
      has_stable_hobby: '',
      self_learning_after_gaokao: '',
      proactive_in_competitions: '',
      likes_reading_extracurricular_books: '',
    };
  });

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const targetElement = event.target;
    const name = targetElement.name;
    const value = targetElement.value;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const session_uuid = await PostBaseInformation(formData, accessToken);
      console.log('提交成功:', formData);
      navigate(`/chat?session=${session_uuid}`);
    } catch (error) {
      if (error instanceof MissingFieldsError) {
        setAlertMessage("请填写所有问题的回答！");
        setShowAlert(true);
      } else {
        console.error('提交失败:', error)
      }
    } finally {
      setLoading(false);
    }
  };

	const handleCommitEvent = () => {
		if (onSubmit !== undefined) {
		  handleSubmit();
		  onSubmit();
		}
		else {
		  handleSubmit();
		}
	};

  const antIcon = <LoadingOutlined className="text-2xl" spin />;

  return (
    <div className="w-[80%] max-w-4xl mx-auto px-4 py-6">
      {showAlert && alertMessage && (
          <Alert
              type='info'
              message={alertMessage}
              closable
              onClose={() => setShowAlert(false)}
              className="mb-4"
          />
      )}
      <h3 className="text-lg font-medium mb-2">💰️父母可供的大学生活费上限是多少？</h3>
      <TextArea
        name="max_living_expenses_from_parents"
        value={formData.max_living_expenses_from_parents}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">💰️当前积蓄是否可能不贷款供完大学四年的生活费？</h3>
      <TextArea
        name="enough_savings_for_college"
        value={formData.enough_savings_for_college}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">💰️你平时的零花钱的用途是什么？</h3>
      <TextArea 
        name="pocket_money_usage" 
        value={formData.pocket_money_usage} 
        onChange={handleChange} 
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">💰️假如让你再读三年高三，每年都会给你的家庭免费的十万人民币，你愿意吗？</h3>
      <TextArea
        name="willing_to_repeat_high_school_for_money"
        value={formData.willing_to_repeat_high_school_for_money}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">🏙主要居住地区是几线城市？</h3>
      <TextArea 
        name="city_tier" 
        value={formData.city_tier} 
        onChange={handleChange} 
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">👨👩父母是否属于体制内？</h3>
      <TextArea
        name="parents_in_public_sector"
        value={formData.parents_in_public_sector}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">🤩是否有稳定的爱好？</h3>
      <TextArea 
        name="has_stable_hobby" 
        value={formData.has_stable_hobby} 
        onChange={handleChange} 
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">📚️在高考完后的这段时间，是否有每天自主学习的习惯？</h3>
      <TextArea
        name="self_learning_after_gaokao"
        value={formData.self_learning_after_gaokao}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">🏁是否主动参加过竞赛？</h3>
      <TextArea
        name="proactive_in_competitions"
        value={formData.proactive_in_competitions}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      <h3 className="text-lg font-medium mb-2">📙平时是否喜欢阅读课外书？</h3>
      <TextArea
        name="likes_reading_extracurricular_books"
        value={formData.likes_reading_extracurricular_books}
        onChange={handleChange}
        readOnly={base_information !== null}
        className="mb-4 w-full h-auto min-h-[100px]"
      />

      {base_information === null && 
        <div className="mt-6 mb-10 flex justify-center">
          <GradientButton onClick={handleCommitEvent} htmlType="submit" disabled={loading} className="px-8 py-2">
            {loading ? <Spin indicator={antIcon} /> : '提交'}
          </GradientButton>
        </div>
      }
    </div>
  );
}

export default BaseInformationPanel;