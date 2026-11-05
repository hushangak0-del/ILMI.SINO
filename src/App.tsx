import React, { useState, useEffect } from 'react';
import { SubjectId, TopicRecord, AppSettings } from './types/index.ts';
import { Flashcard, ExamResult, StudyPlan } from './types/features.ts';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredTopics,
  saveTopic,
  deleteTopic,
  clearAllData,
  getStoredFlashcards,
  saveStoredFlashcards,
  getStoredStudyPlan,
  saveStoredStudyPlan,
  saveStoredExamResult,
} from './services/storage.ts';
import { calculateUserStats } from './utils/studyLogic.ts';
import { getCardsDueToday } from './utils/flashcardsLogic.ts';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav, MainTab } from './components/BottomNav.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { AddTopicModal } from './components/AddTopicModal.tsx';
import { TopicStudyView } from './components/TopicStudyView.tsx';
import { ChatDrawer } from './components/ChatDrawer.tsx';
import { HistoryScreen } from './components/HistoryScreen.tsx';
import { ProgressScreen } from './components/ProgressScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { FlashcardsScreen } from './components/FlashcardsScreen.tsx';
import { MmtExamScreen } from './components/MmtExamScreen.tsx';
import { ProblemSolverModal } from './components/ProblemSolverModal.tsx';
import { StudyPlanScreen } from './components/StudyPlanScreen.tsx';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [topics, setTopics] = useState<TopicRecord[]>(() => getStoredTopics());
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => getStoredFlashcards());
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(() => getStoredStudyPlan());
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [currentTopic, setCurrentTopic] = useState<TopicRecord | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addSubjectId, setAddSubjectId] = useState<SubjectId>('chemistry');
  const [addOption, setAddOption] = useState<string>('Синфи 9');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isProblemSolverOpen, setIsProblemSolverOpen] = useState<boolean>(false);

  // Sync dark class on mount and when settings change
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleSelectSubject = (subjectId: SubjectId, opt: string) => {
    setAddSubjectId(subjectId);
    setAddOption(opt);
    setIsAddModalOpen(true);
  };

  const handleTopicCreated = (topic: TopicRecord) => {
    setTopics((prev) => [topic, ...prev]);
    setIsAddModalOpen(false);
    setCurrentTopic(topic);
  };

  const handleUpdateTopic = (updated: TopicRecord) => {
    const newTopics = saveTopic(updated);
    setTopics(newTopics);
    setCurrentTopic(updated);
  };

  const handleDeleteTopic = (id: string) => {
    const remaining = deleteTopic(id);
    setTopics(remaining);
    if (currentTopic && currentTopic.id === id) {
      setCurrentTopic(null);
    }
  };

  const handleClearAll = () => {
    clearAllData();
    setTopics([]);
    setFlashcards([]);
    setStudyPlan(null);
    setCurrentTopic(null);
  };

  const handleOpenTopic = (topic: TopicRecord) => {
    setCurrentTopic(topic);
  };

  const handleOpenTopicForRepeat = (topic: TopicRecord) => {
    setCurrentTopic(topic);
  };

  const handleExamSaved = (result: ExamResult) => {
    saveStoredExamResult(result);
  };

  const stats = calculateUserStats(topics);
  const dueCardsCount = getCardsDueToday(flashcards).length;

  // Dynamic font class for comfortable reading
  const fontClass =
    settings.fontSize === 'small'
      ? 'text-sm'
      : settings.fontSize === 'large'
      ? 'text-base'
      : 'text-sm sm:text-base';

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 ${fontClass}`}>
      {/* Top Navbar */}
      <Navbar
        streakDays={stats.streakDays}
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenSettings={() => {
          setCurrentTopic(null);
          setActiveTab('settings');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 transition-all">
        {currentTopic ? (
          <TopicStudyView
            topic={currentTopic}
            onBack={() => setCurrentTopic(null)}
            onOpenChat={() => setIsChatOpen(true)}
            onUpdateTopic={handleUpdateTopic}
            onGoToCards={() => {
              setCurrentTopic(null);
              // Refresh flashcards from storage
              setFlashcards(getStoredFlashcards());
              setActiveTab('cards');
            }}
            defaultQuizDisplayMode={settings.quizDisplayMode}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                onSelectSubject={handleSelectSubject}
                onOpenQuickScan={() => {
                  setAddSubjectId('chemistry');
                  setAddOption('Синфи 9');
                  setIsAddModalOpen(true);
                }}
                onOpenProblemSolver={() => setIsProblemSolverOpen(true)}
                recentTopics={topics}
                onOpenTopic={handleOpenTopic}
              />
            )}

            {activeTab === 'cards' && (
              <FlashcardsScreen
                cards={flashcards}
                onUpdateCards={(updated) => {
                  setFlashcards(updated);
                  saveStoredFlashcards(updated);
                }}
                onExploreTopics={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'exam' && (
              <MmtExamScreen
                topics={topics}
                onExamSaved={handleExamSaved}
              />
            )}

            {activeTab === 'plan' && (
              <StudyPlanScreen
                plan={studyPlan}
                onUpdatePlan={(updated) => {
                  setStudyPlan(updated);
                  saveStoredStudyPlan(updated);
                }}
                weakTopicsTitles={stats.weakTopics.map((w) => w.title)}
                onStartSundayExam={() => setActiveTab('exam')}
                onTaskCompleted={() => {
                  // Increments activity
                }}
              />
            )}

            {activeTab === 'history' && (
              <HistoryScreen
                topics={topics}
                onOpenTopic={handleOpenTopic}
                onDeleteTopic={handleDeleteTopic}
                onNewTopic={() => {
                  setAddSubjectId('chemistry');
                  setAddOption('Синфи 9');
                  setIsAddModalOpen(true);
                }}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressScreen
                topics={topics}
                onOpenTopicForRepeat={handleOpenTopicForRepeat}
                onExploreMore={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsScreen
                settings={settings}
                onUpdateSettings={updateSettings}
                onClearAllData={handleClearAll}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Nav (visible when not deep in study view) */}
      {!currentTopic && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          dueCardsCount={dueCardsCount}
        />
      )}

      {/* Add Topic Modal / Screen */}
      {isAddModalOpen && (
        <AddTopicModal
          initialSubjectId={addSubjectId}
          initialOption={addOption}
          onClose={() => setIsAddModalOpen(false)}
          onTopicCreated={handleTopicCreated}
        />
      )}

      {/* Chat with Teacher Drawer */}
      {isChatOpen && currentTopic && (
        <ChatDrawer
          topic={currentTopic}
          onClose={() => setIsChatOpen(false)}
          onOpenProblemSolver={() => {
            setIsChatOpen(false);
            setIsProblemSolverOpen(true);
          }}
        />
      )}

      {/* Step-by-Step Problem Solver Modal */}
      {isProblemSolverOpen && (
        <ProblemSolverModal
          onClose={() => setIsProblemSolverOpen(false)}
        />
      )}
    </div>
  );
}
