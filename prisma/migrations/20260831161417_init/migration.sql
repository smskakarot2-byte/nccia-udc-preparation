-- CreateTable
CREATE TABLE "JobProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyllabusSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "excludeKeywords" TEXT NOT NULL DEFAULT '',
    "minKeywordHits" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyllabusSubject_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "JobProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "notes" TEXT,
    "lastRunAt" DATETIME,
    "questionsFoundLast" INTEGER NOT NULL DEFAULT 0,
    "newQuestionsLast" INTEGER NOT NULL DEFAULT 0,
    "errorsLast" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "sourcesRequested" TEXT NOT NULL,
    "questionsDiscovered" INTEGER NOT NULL DEFAULT 0,
    "relevantCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "irrelevantCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractionJob_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "JobProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtractionSourceResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "found" INTEGER NOT NULL DEFAULT 0,
    "relevant" INTEGER NOT NULL DEFAULT 0,
    "duplicate" INTEGER NOT NULL DEFAULT 0,
    "irrelevant" INTEGER NOT NULL DEFAULT 0,
    "saved" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractionSourceResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ExtractionJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtractionSourceResult_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mcq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobProfileId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT,
    "correctAnswer" TEXT,
    "subject" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceQuestionId" TEXT,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalizedQuestion" TEXT NOT NULL,
    "questionHash" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'auto_imported',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "relevanceConfidence" REAL,
    "relevanceReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mcq_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "JobProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobProfileId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "subject" TEXT,
    "totalQuestions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "incorrect" INTEGER NOT NULL DEFAULT 0,
    "unanswered" INTEGER NOT NULL DEFAULT 0,
    "scorePercent" REAL NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "TestAttempt_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "JobProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestAttemptAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "mcqId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    CONSTRAINT "TestAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestAttemptAnswer_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "Mcq" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JobProfile_key_key" ON "JobProfile"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusSubject_jobProfileId_slug_key" ON "SyllabusSubject"("jobProfileId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

-- CreateIndex
CREATE INDEX "Mcq_questionHash_idx" ON "Mcq"("questionHash");

-- CreateIndex
CREATE INDEX "Mcq_subject_idx" ON "Mcq"("subject");

-- CreateIndex
CREATE INDEX "Mcq_sourceName_idx" ON "Mcq"("sourceName");

-- CreateIndex
CREATE INDEX "Mcq_isActive_isVerified_idx" ON "Mcq"("isActive", "isVerified");

-- CreateIndex
CREATE INDEX "TestAttemptAnswer_attemptId_idx" ON "TestAttemptAnswer"("attemptId");
