<img src="https://episphere.github.io/epivecs/images/logo.png" alt="EpiVECS Logo" >


EpiVECS allows users to perform cluster embedding on the web using a variety of techniques. Cluster embedding is an unsupervised learning technique that combines the strengths of clustering and dimensionality reduction. A cluster embedding method takes a dataset of high-dimensional vectors, assigns each of those vectors to a cluster, and provides a low-dimensional representation of the clusters. 

We recommend readers check out the [introductory Observable Notebook](https://observablehq.com/@siliconjazz/epivecs-cluster-embedding-on-the-web), which explains the concept of cluster embedding in more detail and shows how to use the EpiVECS JavaScript modules.

**Check out the web-tool at: https://episphere.github.io/epivecs/**

---

EpiVECS is also available as a collection of several ES6 modules:

* ``@epivecs/cluster_embedding`` - For the main cluster embedding functionality:
```js
import * as clusterEmbedding from "https://cdn.jsdelivr.net/npm/@epivecs/cluster_embedding/+esm"
```

* ``@epivecs/processing`` - For some of the basic vector processing functionality included in the tool (e.g. smoothing, normalization)
```js
import * as vectorProcessing from "https://cdn.jsdelivr.net/npm/@epivecs/processing/+esm"
```

* ``@epivecs/visualization`` - To help with the visualization of the results.
```js
import * as vectorProcessing from "https://cdn.jsdelivr.net/npm/@epivecs/processing/+esm"
```

For more details on the operation of these libraries, see the [introductory Observable Notebook](https://observablehq.com/@siliconjazz/epivecs-cluster-embedding-on-the-web).
