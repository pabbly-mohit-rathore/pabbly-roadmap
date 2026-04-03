import { fSub } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';

import {
  _id,
  _ages,
  _roles,
  _emails,
  _prices,
  _nativeL,
  _nativeM,
  _nativeS,
  _ratings,
  _booleans,
  _percents,
  _fileNames,
  _fullNames,
  _jobTitles,
  _lastNames,
  _sentences,
  _taskNames,
  _tourNames,
  _eventNames,
  _firstNames,
  _postTitles,
  _courseNames,
  _fullAddress,
  _companyNames,
  _countryNames,
  _descriptions,
  _phoneNumbers,
  _productNames,
} from './assets copy';

// ----------------------------------------------------------------------

const { assetURL } = CONFIG.site;

export const _mock = {
  id: (index) => _id[index],
  time: (index) => fSub({ days: index, hours: index }),
  boolean: (index) => _booleans[index],
  role: (index) => _roles[index],
  // Text
  courseNames: (index) => _courseNames[index],
  fileNames: (index) => _fileNames[index],
  eventNames: (index) => _eventNames[index],
  taskNames: (index) => _taskNames[index],
  postTitle: (index) => _postTitles[index],
  jobTitle: (index) => _jobTitles[index],
  tourName: (index) => _tourNames[index],
  productName: (index) => _productNames[index],
  sentence: (index) => _sentences[index],
  description: (index) => _descriptions[index],
  // Contact
  email: (index) => _emails[index],
  phoneNumber: (index) => _phoneNumbers[index],
  fullAddress: (index) => _fullAddress[index],
  // Name
  firstName: (index) => _firstNames[index],
  lastName: (index) => _lastNames[index],
  fullName: (index) => _fullNames[index],
  companyNames: (index) => _companyNames[index],
  countryNames: (index) => _countryNames[index],
  // Number
  number: {
    percent: (index) => _percents[index],
    rating: (index) => _ratings[index],
    age: (index) => _ages[index],
    price: (index) => _prices[index],
    nativeS: (index) => _nativeS[index],
    nativeM: (index) => _nativeM[index],
    nativeL: (index) => _nativeL[index],
  },
  // Image
  image: {
    cover: (index) => `${assetURL}/assets/images/cover/cover-${index + 1}.webp`,
    avatar: (index) => `${assetURL}/assets/images/avatar/avatar-${index + 1}.webp`,
    travel: (index) => `${assetURL}/assets/images/travel/travel-${index + 1}.webp`,
    course: (index) => `${assetURL}/assets/images/course/course-${index + 1}.webp`,
    company: (index) => `${assetURL}/assets/images/company/company-${index + 1}.webp`,
    product: (index) => `${assetURL}/assets/images/m-product/product-${index + 1}.webp`,
    portrait: (index) => `${assetURL}/assets/images/portrait/portrait-${index + 1}.webp`,
  },
};
