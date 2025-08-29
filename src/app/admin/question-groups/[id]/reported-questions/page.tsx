"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { TriangleAlert, Bug, ArrowLeft, Loader2 } from "lucide-react"
import { format } from "date-fns"
import HexagonLoader from "@/components/Loader/Loading"

interface ReportedQuestion {
  id: string
  suggestion: string
  status: string
  createdAt: string
  question: {
    id: string
    title: string
    content: string
    type: string
    options: string
    correctAnswer: string
    explanation: string | null
    difficulty: string
    group: {
      id: string
      name: string
    }
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function ReportedQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const [reportedQuestions, setReportedQuestions] = useState<ReportedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportedQuestion | null>(null)

  useEffect(() => {
    fetchReportedQuestions()
  }, [params.id])

  const fetchReportedQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${params.id}/reported-questions`)
      if (response.ok) {
        const data = await response.json()
        setReportedQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching reported questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsUpdated = async (reportId: string) => {
    try {
      setUpdating(reportId)
      const response = await fetch(`/api/admin/question-groups/${params.id}/reported-questions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          status: "RESOLVED"
        }),
      })

      if (response.ok) {
        await fetchReportedQuestions()
        setSelectedReport(null)
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error updating report status:", error)
      alert("Error updating report status. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  const getQuestionTypeDisplay = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Multiple Choice"
      case "TRUE_FALSE":
        return "True/False"
      case "FILL_IN_BLANK":
        return "Fill in the Blank"
      case "MULTI_SELECT":
        return "Multi-Select"
      default:
        return type
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800"
      case "HARD":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]"><HexagonLoader size={80} /></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reported Questions</h1>
          <p className="text-muted-foreground">
            Review and manage reported questions for this question group
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reported Questions</CardTitle>
          <CardDescription>
            Questions that users have reported issues with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportedQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reported questions found for this question group.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Reported At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportedQuestions.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs">
                        <RichTextDisplay content={report.question.content} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getQuestionTypeDisplay(report.question.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(report.question.difficulty)}>
                        {report.question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.user.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{report.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog open={selectedReport?.id === report.id} onOpenChange={(open) => setSelectedReport(open ? report : null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Bug className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Report Details</DialogTitle>
                              <DialogDescription>
                                Review the reported question and user feedback
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* User Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reported By</h4>
                                  <p className="font-medium">{selectedReport?.user.name || "Unknown"}</p>
                                  <p className="text-sm text-muted-foreground">{selectedReport?.user.email}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reported At</h4>
                                  <p className="font-medium">
                                    {selectedReport ? format(new Date(selectedReport.createdAt), "MMM d, yyyy HH:mm") : ""}
                                  </p>
                                </div>
                              </div>

                              {/* Question Information */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Question</h4>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="mb-3">
                                    <RichTextDisplay content={selectedReport?.question.content || ""} />
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium">Type:</span>
                                      <span className="ml-2">{selectedReport ? getQuestionTypeDisplay(selectedReport.question.type) : ""}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Difficulty:</span>
                                      <span className="ml-2">
                                        {selectedReport && (
                                          <Badge className={getDifficultyColor(selectedReport.question.difficulty)}>
                                            {selectedReport.question.difficulty}
                                          </Badge>
                                        )}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Group:</span>
                                      <span className="ml-2">{selectedReport?.question.group.name}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Question Details */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Question Details</h4>
                                <div className="space-y-3">
                                  <div>
                                    <span className="font-medium">Options:</span>
                                    <div className="mt-1 bg-muted/30 p-3 rounded text-sm">
                                      {selectedReport?.question.options ? selectedReport.question.options.split(',').map((option, index) => (
                                        <div key={index} className="py-1">
                                          {String.fromCharCode(65 + index)}. {option.trim()}
                                        </div>
                                      )) : "No options"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Correct Answer:</span>
                                    <div className="mt-1 bg-green-50 border border-green-200 p-3 rounded text-sm">
                                      {selectedReport?.question.correctAnswer || "No correct answer specified"}
                                    </div>
                                  </div>
                                  {selectedReport?.question.explanation && (
                                    <div>
                                      <span className="font-medium">Explanation:</span>
                                      <div className="mt-1 bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                                        <RichTextDisplay content={selectedReport.question.explanation} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* User Suggestion */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">User Suggestion</h4>
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                                  <p className="text-sm">{selectedReport?.suggestion || "No suggestion provided"}</p>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedReport(null)}
                              >
                                Close
                              </Button>
                              <Button
                                onClick={() => selectedReport && handleMarkAsUpdated(selectedReport.id)}
                                disabled={updating === selectedReport?.id}
                              >
                                {updating === selectedReport?.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  "Mark as Updated"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}