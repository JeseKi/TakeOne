import { ChangeEventHandler, useState } from 'react';
import { TextArea, GradientButton } from '@lobehub/ui';

function BaseInformation() {
  const [maxLivingExpensesFromParents, setMaxLivingExpensesFromParents] = useState('');
  const [enoughSavingsForCollege, setEnoughSavingsForCollege] = useState('');
  const [pocketMoneyUsage, setPocketMoneyUsage] = useState('');
  const [willingToRepeatHighSchoolForMoney, setWillingToRepeatHighSchoolForMoney] = useState('');
  const [cityTier, setCityTier] = useState('');
  const [parentsInPublicSector, setParentsInPublicSector] = useState('');
  const [hasStableHobby, setHasStableHobby] = useState('');
  const [selfLearningAfterGaokao, setSelfLearningAfterGaokao] = useState('');
  const [proactiveInCompetitions, setProactiveInCompetitions] = useState('');
  const [likesReadingExtracurricularBooks, setLikesReadingExtracurricularBooks] = useState('');

  const handleMaxLivingExpensesFromParentsChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setMaxLivingExpensesFromParents(event.target.value);
  };

  const handleEnoughSavingsForCollegeChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setEnoughSavingsForCollege(event.target.value);
  };

  const handlePocketMoneyUsageChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setPocketMoneyUsage(event.target.value);
  };

  const handleWillingToRepeatHighSchoolForMoneyChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setWillingToRepeatHighSchoolForMoney(event.target.value);
  };

  const handleCityTierChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setCityTier(event.target.value);
  };

  const handleParentsInPublicSectorChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setParentsInPublicSector(event.target.value);
  };

  const handleHasStableHobbyChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setHasStableHobby(event.target.value);
  };

  const handleSelfLearningAfterGaokaoChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setSelfLearningAfterGaokao(event.target.value);
  };

  const handleProactiveInCompetitionsChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setProactiveInCompetitions(event.target.value);
  };

  const handleLikesReadingExtracurricularBooksChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setLikesReadingExtracurricularBooks(event.target.value);
  };

  const handleSubmit = () => {
    const data = {
      maxLivingExpensesFromParents,
      enoughSavingsForCollege,
      pocketMoneyUsage,
      willingToRepeatHighSchoolForMoney,
      cityTier,
      parentsInPublicSector,
      hasStableHobby,
      selfLearningAfterGaokao,
      proactiveInCompetitions,
      likesReadingExtracurricularBooks,
    };

    console.log(data);

    // TODO: 将数据发送到后端 API
    // fetch('/api/base_information', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data),
    // })
    //   .then(response => response.json())
    //   .then(data => {
    //     console.log('Success:', data);
    //   })
    //   .catch(error => {
    //     console.error('Error:', error);
    //   });
  };

  return (
    <>
      <h3>💰️父母可供的大学生活费上限是多少？</h3>
      <TextArea value={maxLivingExpensesFromParents} onChange={handleMaxLivingExpensesFromParentsChange} />

      <h3>💰️当前积蓄是否可能不贷款供完大学四年的生活费？</h3>
      <TextArea value={enoughSavingsForCollege} onChange={handleEnoughSavingsForCollegeChange} />

      <h3>💰️你平时的零花钱的用途是什么？</h3>
      <TextArea value={pocketMoneyUsage} onChange={handlePocketMoneyUsageChange} />

      <h3>💰️假如让你再读三年高三，每年都会给你的家庭免费的十万人民币，你愿意吗？</h3>
      <TextArea value={willingToRepeatHighSchoolForMoney} onChange={handleWillingToRepeatHighSchoolForMoneyChange} />

      <h3>🏙主要居住地区是几线城市？</h3>
      <TextArea value={cityTier} onChange={handleCityTierChange} />

      <h3>👨👩父母是否属于体制内？</h3>
      <TextArea value={parentsInPublicSector} onChange={handleParentsInPublicSectorChange} />

      <h3>🤩是否有稳定的爱好？（需要每周起码有一半的天数会每天做的，且持续时间是一年以上）</h3>
      <TextArea value={hasStableHobby} onChange={handleHasStableHobbyChange} />

      <h3>📚️在高考完后的这段时间，是否有每天自主学习的习惯？</h3>
      <TextArea value={selfLearningAfterGaokao} onChange={handleSelfLearningAfterGaokaoChange} />

      <h3>🏁是否主动参加过竞赛？（被推着上去推着走的不算）</h3>
      <TextArea value={proactiveInCompetitions} onChange={handleProactiveInCompetitionsChange} />

      <h3>📙平时是否喜欢阅读课外书？</h3>
      <TextArea value={likesReadingExtracurricularBooks} onChange={handleLikesReadingExtracurricularBooksChange} />

      <GradientButton onClick={handleSubmit} htmlType="submit">
        提交
      </GradientButton>
    </>
  );
}

export default BaseInformation;