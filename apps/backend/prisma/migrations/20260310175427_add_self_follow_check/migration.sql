-- AddCheckConstraint: prevent self-follows
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_no_self_follow" CHECK ("followerId" != "followeeId");
