-- CreateEnum
CREATE TYPE "DeploymentTargetType" AS ENUM ('KUBERNETES', 'DOCKER', 'SERVERLESS', 'VIRTUAL_MACHINE', 'STATIC');

-- AlterTable
ALTER TABLE "environments" ADD COLUMN "deploymentTargetType" "DeploymentTargetType",
ADD COLUMN "clusterName" TEXT,
ADD COLUMN "clusterRegion" TEXT,
ADD COLUMN "k8sNamespace" TEXT;
