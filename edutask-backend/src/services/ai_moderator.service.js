const chatRepo = require("../repositories/chat_realtime.repo");
const submissionRepo = require("../repositories/submission.repo");

async function analyzeDispute(client, taskId) {
    // Simulate AI analysis of chats and submissions
    const messages = await chatRepo.listChatMessagesByTaskId(client, taskId);
    const submission = await submissionRepo.getSubmissionByTaskId(client, taskId);

    let workerScore = 0;

    if (submission) {
        workerScore += 40; // Base score for having a submission
        if (submission.submission_content.length > 200) workerScore += 20;
        if (submission.submission_files && JSON.parse(submission.submission_files).length > 0) workerScore += 20;
    }

    // Look for "done", "complete", "finished" in chat
    const chatContent = messages.map(m => m.content).join(" ").toLowerCase();
    if (chatContent.includes("done") || chatContent.includes("completed")) {
        workerScore += 10;
    }

    // Look for "scam" or "terrible"
    if (chatContent.includes("scam") || chatContent.includes("reported")) {
        workerScore -= 30;
    }

    if (workerScore >= 80) return 100; // 100% release
    if (workerScore >= 40) return 50;  // 50% release
    return 10; // 10% release (pity/partial effort)
}

module.exports = { analyzeDispute };
