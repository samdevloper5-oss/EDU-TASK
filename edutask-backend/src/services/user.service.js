// User service (business rules enforced here).
// This service composes user/profile/wallet creation but does not manage transactions itself.

const userRepo = require("../repositories/user.repo");
const profileRepo = require("../repositories/profile.repo");
const walletRepo = require("../repositories/wallet.repo");
const { normalizeSkillList } = require("../utils/skills");

async function createUserWithProfileAndWallet(client, payload) {
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
    bio = null,
    profile_image_url,
    verification_document_url,
    role = "student",
    referral_code = null,
    referred_by = null,
  } = payload;

  // Enforce required fields defined by the schema (non-null columns).
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

  const user = await userRepo.createUser(client, {
    email,
    phone,
    student_id,
    password_hash,
    full_name,
    university_name,
    department,
    location,
    skills: normalizeSkillList(skills),
    profile_picture_url: profile_image_url,
    role,
    referral_code,
    referred_by,
  });

  const profile = await profileRepo.createProfile(client, {
    user_id: user.id,
    full_name,
    institution: university_name,
    department,
    bio,
    profile_image_url,
    verification_document_url,
  });

  const wallet = await walletRepo.createWallet(client, user.id);

  return { user, profile, wallet };
}

module.exports = {
  createUserWithProfileAndWallet,
};
