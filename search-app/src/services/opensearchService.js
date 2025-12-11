import axios from 'axios';

// OpenSearch configuration
const OPENSEARCH_URL = process.env.REACT_APP_OPENSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'unified_sessions';

/**
 * Search unified sessions in OpenSearch
 * @param {Object} params - Search parameters
 * @param {string} params.startTime - ISO datetime string
 * @param {string} params.endTime - ISO datetime string
 * @param {string} params.subscriberId - Subscriber ID (MSISDN)
 * @param {string} params.publicIP - Public IP address
 * @param {string} params.privateIP - Private IP address
 * @returns {Promise<{hits: Array, total: number}>}
 */
export async function searchUnifiedSessions(params) {
  const { startTime, endTime, subscriberId, publicIP, privateIP } = params;

  // Build OpenSearch query
  const mustClauses = [];

  // Time range filter - disabled for now as timestamps are null
  // if (startTime || endTime) {
  //   const rangeQuery = {
  //     range: {
  //       loginTime: {}
  //     }
  //   };
  //   
  //   if (startTime) {
  //     rangeQuery.range.loginTime.gte = startTime;
  //   }
  //   
  //   if (endTime) {
  //     rangeQuery.range.loginTime.lte = endTime;
  //   }
  //   
  //   mustClauses.push(rangeQuery);
  // }

  // Subscriber ID filter
  if (subscriberId) {
    mustClauses.push({
      match: {
        subscriberID: subscriberId
      }
    });
  }

  // Public IP filter
  if (publicIP) {
    mustClauses.push({
      term: {
        'publicIP.keyword': publicIP
      }
    });
  }

  // Private IP filter
  if (privateIP) {
    mustClauses.push({
      term: {
        'privateIP.keyword': privateIP
      }
    });
  }

  const searchQuery = {
    query: {
      bool: {
        must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }]
      }
    },
    // Remove sort for now as loginTime is null
    // sort: [
    //   { loginTime: { order: 'desc' } }
    // ],
    size: 100 // Limit to 100 results
  };

  try {
    const response = await axios.post(
      `${OPENSEARCH_URL}/${INDEX_NAME}/_search`,
      searchQuery,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add basic auth if needed
        // auth: {
        //   username: 'admin',
        //   password: 'admin'
        // }
      }
    );

    const hits = response.data.hits.hits.map(hit => ({
      ...hit._source,
      _id: hit._id
    }));

    const total = response.data.hits.total.value || response.data.hits.total;

    return {
      hits,
      total
    };
  } catch (error) {
    console.error('OpenSearch query error:', error);
    
    if (error.response) {
      throw new Error(`OpenSearch error: ${error.response.data.error?.reason || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to OpenSearch. Please check if the service is running.');
    } else {
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}

/**
 * Test OpenSearch connection
 */
export async function testConnection() {
  try {
    const response = await axios.get(`${OPENSEARCH_URL}/_cluster/health`);
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
}
