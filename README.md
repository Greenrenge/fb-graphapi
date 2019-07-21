# DESIGN STATEMENTS
## should be auto paging and remove data[] out of the returned facebook
## can inject request pipeline inside
## can easily debug when needed, like a want the real return of FB,
## const..of inside const..of
## default paging == off

## ** HOW TO HANDLE ERROR FOR EACH GENERATOR PAGING
```

 try{
  for await  (const comment of comments){
    //format
  }
 }
 catch (err){
    //req error how retry ??? can we provide retry state detail info for user make it a retry? //format starting node?
 }

```

```
   for(const message of Query({...}) ){
       const {from, created_time,posts}  = message
       for( const post of posts ){ //any paging inside
          //how we prevent paging here (paging option + max items ??) --> if paging enable return async iterator else return normal array
       }
   }
```