const { withSerializableTransaction } = require("../utils/transaction");
const profileRepo = require("../repositories/profile.repo");
const userRepo = require("../repositories/user.repo");
const { ApiError } = require("../utils/http");

async function getMyProfile(user) {
  return withSerializableTransaction(async (client) => {
    const row = await profileRepo.getProfileSummaryByUserId(client, user.id);
    if (!row) {
      throw new ApiError(404, "profile_not_found", "Profile not found.");
    }

    const completed = Number(row.completed_task_count || 0);
    const resolved = Number(row.resolved_task_count || 0);
    const successRate = resolved > 0 ? Number(((completed / resolved) * 100).toFixed(2)) : 0;

    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      university_name: row.university_name,
      department: row.department,
      student_id: row.student_id,
      location: row.location,
      phone: row.phone,
      skills: row.skills || [],
      profile_picture_url: row.profile_picture_url,
      role: row.role,
      is_verified: row.is_verified,
      bio: row.bio || null,
      verification_status: row.verification_status || "unverified",
      total_earnings: Number(row.total_earnings || 0),
      trustScore: Number(row.trust_score || 0),
      completedTaskCount: completed,
      activeTaskCount: Number(row.active_task_count || 0),
      successRate,
    };
  }, { operation: "profile_me" });
}

module.exports = {
  getMyProfile,
  async updateProfilePicture(user, profilePictureUrl) {
    await withSerializableTransaction(
      async (client) => {
        await userRepo.updateProfilePictureUrl(client, user.id, profilePictureUrl);
      },
      { operation: "profile_update_picture" }
    );

    return getMyProfile(user);
  },
  async getUserReviews(userId, limit, offset) {
    return withSerializableTransaction(async (client) => {
      const result = await client.query(
        `SELECT tr.*, u.full_name as reviewer_name, u.profile_picture_url as reviewer_avatar
         FROM task_reviews tr
         JOIN users u ON tr.reviewer_id = u.id
         WHERE tr.reviewee_id = $1
         ORDER BY tr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result.rows;
    });
  }
};
