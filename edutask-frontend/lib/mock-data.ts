export interface Task {
  id: string
  title: string
  description: string
  type: 'online' | 'offline' | 'volunteer'
  payment?: number
  hours?: number
  deadline: string
  location: string
  postedBy: string
  postedByAvatar: string
  applicants: number
  status: 'open' | 'assigned' | 'completed'
  requiredMembers?: number
  skills: string[]
}

export interface User {
  id: string
  name: string
  email: string
  university: string
  department: string
  studentId: string
  location: string
  phone: string
  skills: string[]
  avatar: string
  trustScore: number
  volunteerHours: number
  balance: number
  pendingEscrow: number
  completedTasks: number
  about: string
  reviews: { from: string; rating: number; text: string }[]
  isEmailVerified: boolean
  isPhoneVerified: boolean
}

export interface Message {
  id: string
  text: string
  sender: 'me' | 'other'
  timestamp: string
}

export interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
  messages: Message[]
}

export interface Transaction {
  id: string
  date: string
  type: 'deposit' | 'withdraw' | 'earned' | 'escrow'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  description: string
}

export interface Notification {
  id: string
  type: 'application' | 'accepted' | 'rejected' | 'completed' | 'volunteer'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface Applicant {
  id: string
  name: string
  avatar: string
  trustScore: number
  skills: string[]
  university: string
}

export const currentUser: User = {
  id: 'u1',
  name: 'Rafiq Ahmed',
  email: 'rafiq@bracu.ac.bd',
  university: 'BRAC University',
  department: 'Computer Science',
  studentId: '20301045',
  location: 'Dhaka, Bangladesh',
  phone: '+880 1712 345678',
  skills: ['Web Dev', 'Data Entry', 'Graphic Design', 'Research'],
  avatar: '',
  trustScore: 4.8,
  volunteerHours: 45,
  balance: 2450,
  pendingEscrow: 800,
  completedTasks: 23,
  about: 'Computer Science student at BRAC University. Passionate about web development and helping fellow students with tech-related tasks.',
  reviews: [
    { from: 'Nadia K.', rating: 5, text: 'Excellent work! Completed the task ahead of schedule.' },
    { from: 'Tanvir H.', rating: 4, text: 'Very professional and communicative.' },
    { from: 'Sadia R.', rating: 5, text: 'Outstanding quality. Would hire again!' },
  ],
  isEmailVerified: true,
  isPhoneVerified: true,
}

export const tasks: Task[] = [
  {
    id: 't1',
    title: 'Build a Portfolio Website',
    description: 'Need someone to build a simple portfolio website using HTML, CSS, and JavaScript.',
    type: 'online',
    payment: 500,
    deadline: '2026-03-15',
    location: 'Remote',
    postedBy: 'Nadia K.',
    postedByAvatar: '',
    applicants: 5,
    status: 'open',
    skills: ['Web Dev', 'HTML', 'CSS'],
  },
  {
    id: 't2',
    title: 'Data Entry for Research Project',
    description: 'Help enter survey data into Excel spreadsheets for a sociology research project.',
    type: 'offline',
    payment: 300,
    deadline: '2026-03-10',
    location: 'BRAC University Library',
    postedBy: 'Tanvir H.',
    postedByAvatar: '',
    applicants: 3,
    status: 'open',
    skills: ['Data Entry', 'Excel'],
  },
  {
    id: 't3',
    title: 'Campus Clean-Up Drive',
    description: 'Organize and participate in a campus clean-up event.',
    type: 'volunteer',
    hours: 4,
    deadline: '2026-03-20',
    location: 'Main Campus',
    postedBy: 'Student Council',
    postedByAvatar: '',
    applicants: 12,
    status: 'open',
    requiredMembers: 20,
    skills: ['Teamwork', 'Leadership'],
  },
  {
    id: 't4',
    title: 'Graphic Design for Club Poster',
    description: 'Design promotional posters for upcoming cultural event.',
    type: 'online',
    payment: 400,
    deadline: '2026-03-08',
    location: 'Remote',
    postedBy: 'Sadia R.',
    postedByAvatar: '',
    applicants: 7,
    status: 'assigned',
    skills: ['Graphic Design', 'Canva', 'Photoshop'],
  },
  {
    id: 't5',
    title: 'Tutoring for Calculus II',
    description: 'Looking for a tutor who can help with Calculus II assignments and exam prep.',
    type: 'offline',
    payment: 600,
    deadline: '2026-04-01',
    location: 'NSU Campus',
    postedBy: 'Arif M.',
    postedByAvatar: '',
    applicants: 2,
    status: 'open',
    skills: ['Mathematics', 'Teaching'],
  },
  {
    id: 't6',
    title: 'Blood Donation Campaign Volunteer',
    description: 'Help organize and manage the annual blood donation campaign on campus.',
    type: 'volunteer',
    hours: 6,
    deadline: '2026-03-25',
    location: 'IUB Auditorium',
    postedBy: 'Red Crescent Club',
    postedByAvatar: '',
    applicants: 15,
    status: 'open',
    requiredMembers: 30,
    skills: ['Organization', 'Communication'],
  },
  {
    id: 't7',
    title: 'Mobile App Testing',
    description: 'Test a new mobile app and provide detailed bug reports.',
    type: 'online',
    payment: 250,
    deadline: '2026-03-12',
    location: 'Remote',
    postedBy: 'Karim B.',
    postedByAvatar: '',
    applicants: 4,
    status: 'completed',
    skills: ['Testing', 'Documentation'],
  },
  {
    id: 't8',
    title: 'Presentation Slides Design',
    description: 'Create professional presentation slides for a thesis defense.',
    type: 'online',
    payment: 350,
    deadline: '2026-03-18',
    location: 'Remote',
    postedBy: 'Fatima Z.',
    postedByAvatar: '',
    applicants: 6,
    status: 'open',
    skills: ['PowerPoint', 'Design'],
  },
]

export const conversations: Conversation[] = [
  {
    id: 'c1',
    name: 'Nadia K.',
    avatar: '',
    lastMessage: 'Thanks for applying! When can you start?',
    timestamp: '2:30 PM',
    unread: 2,
    messages: [
      { id: 'm1', text: 'Hi! I saw your application for the portfolio website task.', sender: 'other', timestamp: '2:15 PM' },
      { id: 'm2', text: 'Yes, I am very interested! I have experience with React and modern CSS.', sender: 'me', timestamp: '2:20 PM' },
      { id: 'm3', text: 'That sounds great! Can you share some examples?', sender: 'other', timestamp: '2:25 PM' },
      { id: 'm4', text: 'Thanks for applying! When can you start?', sender: 'other', timestamp: '2:30 PM' },
    ],
  },
  {
    id: 'c2',
    name: 'Tanvir H.',
    avatar: '',
    lastMessage: 'The data entry is in the shared folder.',
    timestamp: '1:45 PM',
    unread: 0,
    messages: [
      { id: 'm5', text: 'Hey! Ready to start the data entry task?', sender: 'other', timestamp: '1:30 PM' },
      { id: 'm6', text: 'Yes! Just need access to the spreadsheet.', sender: 'me', timestamp: '1:35 PM' },
      { id: 'm7', text: 'The data entry is in the shared folder.', sender: 'other', timestamp: '1:45 PM' },
    ],
  },
  {
    id: 'c3',
    name: 'Student Council',
    avatar: '',
    lastMessage: 'See you at the clean-up event!',
    timestamp: '11:00 AM',
    unread: 1,
    messages: [
      { id: 'm8', text: 'Welcome to the campus clean-up volunteer group!', sender: 'other', timestamp: '10:30 AM' },
      { id: 'm9', text: 'Happy to be part of this!', sender: 'me', timestamp: '10:45 AM' },
      { id: 'm10', text: 'See you at the clean-up event!', sender: 'other', timestamp: '11:00 AM' },
    ],
  },
]

export const transactions: Transaction[] = [
  { id: 'tx1', date: '2026-02-25', type: 'earned', amount: 500, status: 'completed', description: 'Portfolio Website Task' },
  { id: 'tx2', date: '2026-02-24', type: 'escrow', amount: 400, status: 'pending', description: 'Graphic Design Task' },
  { id: 'tx3', date: '2026-02-23', type: 'deposit', amount: 1000, status: 'completed', description: 'bKash Deposit' },
  { id: 'tx4', date: '2026-02-22', type: 'earned', amount: 300, status: 'completed', description: 'Data Entry Task' },
  { id: 'tx5', date: '2026-02-21', type: 'withdraw', amount: 500, status: 'completed', description: 'bKash Withdraw' },
  { id: 'tx6', date: '2026-02-20', type: 'escrow', amount: 400, status: 'pending', description: 'Poster Design Escrow' },
  { id: 'tx7', date: '2026-02-19', type: 'earned', amount: 250, status: 'completed', description: 'App Testing Task' },
]

export const notifications: Notification[] = [
  { id: 'n1', type: 'application', title: 'New Application', message: 'Sadia R. applied to your "Presentation Slides" task.', timestamp: '5 min ago', read: false },
  { id: 'n2', type: 'accepted', title: 'Application Accepted', message: 'Your application for "Portfolio Website" was accepted!', timestamp: '1 hour ago', read: false },
  { id: 'n3', type: 'completed', title: 'Task Completed', message: '"Mobile App Testing" has been marked as completed.', timestamp: '3 hours ago', read: true },
  { id: 'n4', type: 'volunteer', title: 'Volunteer Slots Filling', message: 'Only 5 spots left for "Campus Clean-Up Drive".', timestamp: '5 hours ago', read: true },
  { id: 'n5', type: 'rejected', title: 'Application Update', message: 'Your application for "Logo Design" was not selected.', timestamp: '1 day ago', read: true },
]

export const leaderboardTrust = [
  { rank: 1, name: 'Anika S.', university: 'BRAC University', score: 4.95, avatar: '' },
  { rank: 2, name: 'Rafiq Ahmed', university: 'BRAC University', score: 4.8, avatar: '' },
  { rank: 3, name: 'Tanvir H.', university: 'NSU', score: 4.75, avatar: '' },
  { rank: 4, name: 'Nadia K.', university: 'IUB', score: 4.7, avatar: '' },
  { rank: 5, name: 'Sadia R.', university: 'BUET', score: 4.65, avatar: '' },
  { rank: 6, name: 'Karim B.', university: 'DU', score: 4.6, avatar: '' },
  { rank: 7, name: 'Fatima Z.', university: 'AIUB', score: 4.55, avatar: '' },
  { rank: 8, name: 'Arif M.', university: 'NSU', score: 4.5, avatar: '' },
  { rank: 9, name: 'Rima T.', university: 'BRAC University', score: 4.45, avatar: '' },
  { rank: 10, name: 'Hasan K.', university: 'BUET', score: 4.4, avatar: '' },
]

export const leaderboardVolunteer = [
  { rank: 1, name: 'Sadia R.', university: 'BUET', hours: 120, avatar: '' },
  { rank: 2, name: 'Tanvir H.', university: 'NSU', hours: 98, avatar: '' },
  { rank: 3, name: 'Rafiq Ahmed', university: 'BRAC University', hours: 45, avatar: '' },
  { rank: 4, name: 'Nadia K.', university: 'IUB', hours: 42, avatar: '' },
  { rank: 5, name: 'Anika S.', university: 'BRAC University', hours: 38, avatar: '' },
  { rank: 6, name: 'Fatima Z.', university: 'AIUB', hours: 35, avatar: '' },
  { rank: 7, name: 'Arif M.', university: 'NSU', hours: 30, avatar: '' },
  { rank: 8, name: 'Karim B.', university: 'DU', hours: 25, avatar: '' },
  { rank: 9, name: 'Rima T.', university: 'BRAC University', hours: 20, avatar: '' },
  { rank: 10, name: 'Hasan K.', university: 'BUET', hours: 18, avatar: '' },
]

export const applicants: Applicant[] = [
  { id: 'a1', name: 'Anika S.', avatar: '', trustScore: 4.95, skills: ['Web Dev', 'React', 'Design'], university: 'BRAC University' },
  { id: 'a2', name: 'Karim B.', avatar: '', trustScore: 4.6, skills: ['Testing', 'Python', 'Data Entry'], university: 'DU' },
  { id: 'a3', name: 'Fatima Z.', avatar: '', trustScore: 4.55, skills: ['Design', 'PowerPoint', 'Writing'], university: 'AIUB' },
  { id: 'a4', name: 'Hasan K.', avatar: '', trustScore: 4.4, skills: ['Web Dev', 'JavaScript', 'Node.js'], university: 'BUET' },
]

export const availableSkills = [
  'Web Dev', 'Data Entry', 'Graphic Design', 'Research', 'Writing',
  'Teaching', 'Photography', 'Video Editing', 'Translation', 'Excel',
  'Python', 'JavaScript', 'React', 'Marketing', 'Social Media',
  'Testing', 'Documentation', 'Canva', 'Photoshop', 'PowerPoint',
  'Mathematics', 'Communication', 'Leadership', 'Organization', 'Teamwork',
]
