const router = require('express').Router();
const Candidate = require('../models/candidate');
const Position = require('../models/position');
const Skills = require('../models/skills');
const { registerValidation } = require('../validation/validation');

// index page
router.get('/', async (req, res) => {
  res.render('insert_users', { success: '', error: '' });
});

// Register API
router.post('/register', async (req, res) => {
  // Check validation of phone, email
  const { error } = registerValidation(req.body);
  if (error) {
    if (error.details[0].message.includes('phone')) {
      return res.render('insert_users', {
        success: '',
        error: 'Phone number is invalid'
      });
    }
    return res.render('insert_users', {
      success: '',
      error: error.details[0].message
    });
  }
  // Checking if the candidate exits in DB
  const emailExist = await Candidate.findOne({ email: req.body.email });
  if (emailExist) {
    return res.render('insert_users', {
      success: '',
      error: 'Email already exists'
    });
  }

  // Convert skills to lower case after splitting string into array(delimiter - comma)
  const skills_array = req.body.skills.split(',').map(item => {
    return item.trim().toLowerCase();
  });

  // Splitting companies worked string into array(delimiter - comma)
  const companiesWorked_array = req.body.companiesWorked
    .split(',')
    .map(item => {
      return item.trim();
    });

  const candidate = new Candidate({
    name: req.body.name,
    email: req.body.email,
    position: req.body.position.toLowerCase(),
    experience: req.body.experience,
    qualification: req.body.qualification,
    candidateRating: req.body.candidateRating,
    salary: req.body.salary,
    phone: req.body.phone,
    companiesWorked: companiesWorked_array,
    skills: skills_array,
    interviewFeedback: req.body.interviewFeedback,
    resumeURL: req.body.resumeURL
  });

  await candidate
    .save()
    .then(async function() {
      // Checking and inserting into position collection
      const candidate_position = candidate['position'];
      const positionExist = await Position.findOne({
        position: candidate_position
      });
      if (!positionExist) {
        const pos = new Position({
          position: candidate_position
        });
        pos.save();
      }

      // Checking and inserting into skills collection
      const candidate_skills = candidate['skills'];
      candidate_skills.forEach(async skill => {
        const skillsExist = await Skills.findOne({ skill: skill });
        if (!skillsExist) {
          const new_skill = new Skills({
            skill: skill
          });
          new_skill.save();
        }
      });

      return res.render('insert_users', {
        success: 'Record inserted successfully',
        error: ''
      });
    })
    .catch(err => res.status(400).json(`Error:${err}`));
});

// View candidates
router.get('/list', (req, res) => {
  const userFilter = Candidate.find({});
  userFilter.exec((err, data) => {
    if (err) throw err;
    res.render('list', { records: data, error: '' });
  });
});

// Delete API
router.get('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const del = Candidate.findByIdAndDelete(id);
  del.exec(err => {
    if (err) throw err;
    res.redirect('/api/candidate/list');
  });
});

// Edit API
router.get('/edit/:id', async (req, res) => {
  const { id } = req.params;
  const edit = Candidate.findById(id);
  edit.exec((err, data) => {
    if (err) throw err;
    res.render('edit', { records: data, success: '', error: '' });
  });
});

// Search-Filter API
router.post('/search', function(req, res, next) {
  const fltrPosition = req.body.fltrposition;

  // Assuming skill is comma separated without space
  const fltrSkill = req.body.fltrskill.split(',').map(item => {
    return item.trim();
  });
  let flterParameter;

  if (fltrPosition === '' && req.body.fltrskill === '') {
    console.log('search all');
    flterParameter = {};
  } else if (fltrPosition === '' && req.body.fltrskill !== '') {
    flterParameter = {
      skills: { $all: fltrSkill }
    };
  } else if (req.body.fltrskill === '' && fltrPosition !== '') {
    // Issue : This works only if there are no preceding or trailing commas
    flterParameter = {
      position: fltrPosition
    };
  } else {
    flterParameter = {
      skills: { $all: fltrSkill },
      position: fltrPosition
    };
  }

  console.log(flterParameter);
  const candidateFilter = Candidate.find(flterParameter);
  candidateFilter.exec(function(err, data) {
    if (err) throw err;
    if (data.length > 0) {
      res.render('list', { records: data, error: '' });
      console.log('Printing all list');
    } else {
      console.log('Data is empty');
      const newCandidateFilter = Candidate.find();
      newCandidateFilter.exec(function(error, result) {
        if (error) throw error;
        res.render('list', { records: result, error: 'No records were found' });
      });
    }
  });
});

module.exports = router;
