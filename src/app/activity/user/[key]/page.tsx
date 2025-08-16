"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, Users, CheckCircle, XCircle } from "lucide-react";

// Mock data for the activity
const mockActivity = {
  id: "1",
  title: "Math Quiz 2024",
  description: "Annual mathematics competition for high school students",
  accessKey: "MATH2024",
  status: "active",
  questions: 20,
  participants: 45,
};

// Mock user data
const mockUser = {
  id: "1",
  name: "Alice Johnson",
};

// Mock questions
const mockQuestions = [
  {
    id: "1",
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    points: 1000,
  },
  {
    id: "2",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    points: 1000,
  },
];

export default function ActivityUserPage() {
  const params = useParams();
  const key = params.key as string;
  
  const [quizState, setQuizState] = useState<'waiting' | 'playing' | 'answered' | 'results'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [timer, setTimer] = useState(10);
  const [score, setScore] = useState(0);
  const [answerTime, setAnswerTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Simulate quiz starting after 3 seconds
    const startTimer = setTimeout(() => {
      setQuizState('playing');
      setStartTime(Date.now());
    }, 3000);

    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (quizState !== 'playing') return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Time's up - auto-submit if not answered
          if (!selectedAnswer) {
            handleSubmitAnswer();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizState, selectedAnswer]);

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const timeTaken = startTime ? (Date.now() - startTime) / 1000 : 0;
    setAnswerTime(timeTaken);
    
    const question = mockQuestions[currentQuestion];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (isCorrect) {
      // Calculate score: base points minus time penalty (50 points per second)
      const timePenalty = Math.floor(timeTaken * 50);
      const questionScore = Math.max(0, question.points - timePenalty);
      setScore(prev => prev + questionScore);
    }

    setQuizState('answered');

    // Move to next question or show results after 3 seconds
    setTimeout(() => {
      if (currentQuestion < mockQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setQuizState('playing');
        setSelectedAnswer("");
        setTimer(10);
        setStartTime(Date.now());
      } else {
        setQuizState('results');
      }
    }, 3000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const question = mockQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Activity info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">{mockActivity.title}</h1>
                <p className="text-muted-foreground text-sm">{mockActivity.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{mockActivity.participants}</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {mockActivity.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        {quizState === 'waiting' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {getInitials(mockUser.name)}
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome, {mockUser.name}!</h2>
                <p className="text-muted-foreground">
                  Waiting for the admin to start the quiz...
                </p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {quizState === 'playing' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Question {currentQuestion + 1} of {mockQuestions.length}</CardTitle>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono ${timer <= 5 ? 'text-red-600' : ''}`}>
                    {timer}s
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!selectedAnswer}
                className="w-full"
              >
                Submit Answer
              </Button>
            </CardContent>
          </Card>
        )}

        {quizState === 'answered' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                {isCorrect ? (
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                )}
                <h2 className="text-2xl font-bold mb-2">
                  {isCorrect ? 'Correct!' : 'Incorrect!'}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {isCorrect 
                    ? `You earned ${Math.max(0, question.points - Math.floor(answerTime * 50))} points!`
                    : `The correct answer was: ${question.correctAnswer}`
                  }
                </p>
                <div className="text-sm text-muted-foreground">
                  Time taken: {answerTime.toFixed(1)}s
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Waiting for next question...
              </div>
            </CardContent>
          </Card>
        )}

        {quizState === 'results' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
                <div className="text-4xl font-bold text-primary mb-4">
                  {score} points
                </div>
                <p className="text-muted-foreground">
                  Thank you for participating in {mockActivity.title}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Questions:</span>
                  <span>{mockQuestions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Correct Answers:</span>
                  <span> {/* Calculate based on answers */ }</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Accuracy:</span>
                  <span> {/* Calculate accuracy */ }</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score display */}
        <div className="mt-4 text-center">
          <div className="text-sm text-muted-foreground">
            Current Score: <span className="font-bold text-primary">{score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}