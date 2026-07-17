/**
 * Dynamic Reviews Handler - Client-side script for populating reviews sections
 *
 * During site generation, the REVIEWS variable is replaced with actual review data.
 *
 * Features:
 * - Filters reviews: 5-star only, minimum 5 words
 * - Prioritizes by relevance (location/service tag match) then by date
 * - Populates review containers on all pages
 * - Reads page context from URL or data attributes
 */

(() => {
  // Reviews configuration - replaced during site generation
  var REVIEWS = __REVIEWS_CONFIG__;

  /**
   * Extract location and service from URL pathname
   */
  function parseLocationService(pathname) {
    var cleanPath = pathname.replace(/\.html$/, '');

    var localPattern = /^\/local\/([^/]+)-in-([^/]+)$/;
    var localMatch = localPattern.exec(cleanPath);
    if (localMatch) {
      return {
        service: localMatch[1].replace(/-/g, ' '),
        location: localMatch[2].replace(/-/g, ' '),
      };
    }

    var inPattern = /^\/([^/]+)-in-([^/]+)$/;
    var inMatch = inPattern.exec(cleanPath);
    if (inMatch) {
      return {
        service: inMatch[1].replace(/-/g, ' '),
        location: inMatch[2].replace(/-/g, ' '),
      };
    }

    var slashPattern = /^\/([^/]+)\/([^/]+)$/;
    var slashMatch = slashPattern.exec(cleanPath);
    if (slashMatch) {
      return {
        location: slashMatch[1].replace(/-/g, ' '),
        service: slashMatch[2].replace(/-/g, ' '),
      };
    }

    return { service: null, location: null };
  }

  /**
   * Get page context from data attributes or URL
   */
  function getPageContext(container) {
    var dataLocation = container ? container.getAttribute('data-location') : null;
    var dataService = container ? container.getAttribute('data-service') : null;

    if (dataLocation || dataService) {
      return { location: dataLocation, service: dataService };
    }

    return parseLocationService(window.location.pathname);
  }

  /**
   * Count words in a string
   */
  function countWords(text) {
    if (!text) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Calculate relevance score for a review
   */
  function calculateRelevance(review, pageContext) {
    var score = 0;
    var content = (review.content || review.text || '').toLowerCase();

    if (pageContext.location) {
      var locationLower = pageContext.location.toLowerCase();
      if (review.locationTags && Array.isArray(review.locationTags)) {
        for (var i = 0; i < review.locationTags.length; i++) {
          if (review.locationTags[i].toLowerCase() === locationLower) {
            score += 3;
            break;
          }
        }
      }
      if (content.indexOf(locationLower) !== -1) {
        score += 1;
      }
    }

    if (pageContext.service) {
      var serviceLower = pageContext.service.toLowerCase();
      if (review.serviceTags && Array.isArray(review.serviceTags)) {
        for (var j = 0; j < review.serviceTags.length; j++) {
          if (review.serviceTags[j].toLowerCase() === serviceLower) {
            score += 3;
            break;
          }
        }
      }
      if (content.indexOf(serviceLower) !== -1) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Parse date string to timestamp
   */
  function parseDate(dateStr) {
    if (!dateStr) return 0;
    var timestamp = new Date(dateStr).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  /**
   * Filter and sort reviews
   */
  function filterAndSortReviews(reviews, pageContext) {
    if (!reviews || !Array.isArray(reviews)) return [];

    var filtered = reviews.filter((review) => {
      var rating = review.rating;
      if (rating !== null && rating !== undefined && rating < 5) {
        return false;
      }

      var text = review.content || review.text || '';
      if (countWords(text) < 5) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      var aRelevance = calculateRelevance(a, pageContext);
      var bRelevance = calculateRelevance(b, pageContext);

      if (aRelevance !== bRelevance) {
        return bRelevance - aRelevance;
      }

      return parseDate(b.date) - parseDate(a.date);
    });

    return filtered;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate star rating HTML
   */
  function generateStars(rating) {
    var stars = '';
    var fullStars = Math.floor(rating || 5);
    var hasHalfStar = (rating || 5) % 1 >= 0.5;

    for (var i = 0; i < fullStars; i++) {
      stars +=
        '<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>';
    }
    var emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (var j = 0; j < emptyStars; j++) {
      stars +=
        '<svg class="w-5 h-5 text-gray-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>';
    }

    return stars;
  }

  /**
   * Render a single review card (matches Astro ReviewsSection styling)
   */
  function renderReviewCard(review, idx) {
    var rating = review.rating || 5;
    var author = escapeHtml(review.author || 'Anonymous');
    var content = escapeHtml(review.content || review.text || '');
    var date = review.date ? escapeHtml(review.date) : '';
    var platform = review.platform || 'Google';
    var initials = author
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);

    return (
      '<div class="review-card group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1" style="animation-delay: ' +
      idx * 100 +
      'ms; opacity: 0; animation: reviewFadeIn 0.6s ease-out forwards;">' +
      '<div class="absolute -top-3 -left-3 w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">' +
      '<svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">' +
      '<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />' +
      '</svg>' +
      '</div>' +
      '<div class="absolute top-4 right-4">' +
      '<span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold bg-white text-gray-700 shadow-sm">' +
      (platform === 'Google' ? 'G' : platform === 'Yelp' ? 'Y' : 'f') +
      '</span>' +
      '</div>' +
      '<div class="flex gap-1 mb-4 mt-2">' +
      generateStars(rating) +
      '</div>' +
      '<p class="text-gray-700 leading-relaxed line-clamp-4 mb-6">"' +
      content +
      '"</p>' +
      '<div class="flex items-center gap-3 pt-4 border-t border-gray-100">' +
      '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm shadow-md">' +
      initials +
      '</div>' +
      '<div>' +
      '<p class="font-semibold text-gray-900">' +
      author +
      '</p>' +
      (date ? `<p class="text-sm text-gray-500">${date}</p>` : '') +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * Populate reviews into container
   */
  function populateReviews(container, reviews, maxReviews) {
    if (!container || !reviews || reviews.length === 0) return;

    maxReviews = maxReviews || 6;
    var displayReviews = reviews.slice(0, maxReviews);

    var listContainer = container.querySelector('.reviews-grid, .cs-card-group, ul');

    if (listContainer) {
      var html = '';
      for (var i = 0; i < displayReviews.length; i++) {
        html += renderReviewCard(displayReviews[i], i);
      }
      listContainer.innerHTML = html;
    }

    container.setAttribute('data-reviews-populated', 'true');
    container.setAttribute('data-reviews-count', displayReviews.length.toString());
  }

  /**
   * Initialize reviews handler
   */
  function initReviewsHandler(reviewsConfig) {
    if (!reviewsConfig || !reviewsConfig.reviews || reviewsConfig.reviews.length === 0) {
      return;
    }

    function populateAllContainers() {
      var containers = document.querySelectorAll('[data-reviews-container]');

      containers.forEach((container) => {
        if (container.getAttribute('data-reviews-populated') === 'true') return;

        var pageContext = getPageContext(container);
        var maxReviews = parseInt(container.getAttribute('data-max-reviews'), 10) || 6;

        var filteredReviews = filterAndSortReviews(reviewsConfig.reviews, pageContext);
        populateReviews(container, filteredReviews, maxReviews);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', populateAllContainers);
    } else {
      populateAllContainers();
    }
  }

  initReviewsHandler(REVIEWS);
})();
