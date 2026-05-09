// User repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function createUser(client, data) {
  const {
    email,
    phone,
    student_id,
    password_hash,
    full_name,
    university_name,
    department,
    location,
    skills,
    profile_picture_url = null,
    role = "student",
    referral_code = null,
    referred_by = null,
  } = data;

  if (
    !email ||
    !phone ||
    !student_id ||
    !password_hash ||
    !full_name ||
    !university_name ||
    !department ||
    !location
  ) {
    throw new Error(
      "email, phone, student_id, password_hash, full_name, university_name, department, and location are required."
    );
  }

  const result = await client.query(
    `
      INSERT INTO users (
        email,
        phone,
        student_id,
        password_hash,
        full_name,
        university_name,
        department,
        location,
        skills,
        profile_picture_url,
        role,
        referral_code,
        referred_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13)
      RETURNING *
    `,
    [
      email,
      phone,
      student_id,
      password_hash,
      full_name,
      university_name,
      department,
      location,
      JSON.stringify(Array.isArray(skills) ? skills : []),
      profile_picture_url,
      role,
      referral_code,
      referred_by,
    ]
  );
  return result.rows[0] || null;
}

async function getUserByEmail(client, email, forUpdate = false, includeDeleted = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM users WHERE email = $1${deletedFilter}${lock}`,
    [email]
  );
  return result.rows[0] || null;
}

async function getUserByPhone(client, phone, forUpdate = false, includeDeleted = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM users WHERE phone = $1${deletedFilter}${lock}`,
    [phone]
  );
  return result.rows[0] || null;
}

async function getUserByStudentId(client, studentId, forUpdate = false, includeDeleted = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM users WHERE student_id = $1${deletedFilter}${lock}`,
    [studentId]
  );
  return result.rows[0] || null;
}

async function getUserById(client, userId, includeDeleted = false) {
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM users WHERE id = $1${deletedFilter}`,
    [userId]
  );
  return result.rows[0] || null;
}

async function touchLastLogin(client, userId) {
  await client.query(
    `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = $1
    `,
    [userId]
  );
}

async function incrementUserTotalEarnings(client, userId, amount) {
  const result = await client.query(
    `
      UPDATE users
      SET total_earnings = COALESCE(total_earnings, 0) + $2
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING id, total_earnings
    `,
    [userId, amount]
  );
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserByPhone,
  getUserByStudentId,
  getUserById,
  touchLastLogin,
  incrementUserTotalEarnings,
  async getUserByVerificationToken(client, token, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const result = await client.query(
      `SELECT * FROM users WHERE email_verification_token = $1${lock}`,
      [token]
    );
    return result.rows[0] || null;
  },
  async updateEmailVerificationInfo(client, userId, { token, expiresAt }) {
    await client.query(
      `
        UPDATE users
        SET email_verification_token = $2, email_verification_expires_at = $3
        WHERE id = $1
      `,
      [userId, token, expiresAt]
    );
  },
  async markEmailVerified(client, userId) {
    await client.query(
      `
        UPDATE users
        SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires_at = NULL
        WHERE id = $1
      `,
      [userId]
    );
  },
  async updateProfilePictureUrl(client, userId, profilePictureUrl) {
    await client.query(
      `
        UPDATE users
        SET profile_picture_url = $2
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [userId, profilePictureUrl]
    );
  },
};
